/**
 * User Activity Logger
 * 
 * Sends activity events to the webhook for audit/monitoring purposes.
 * Actions tracked: ADD, EDIT, DELETE, APPROVE
 * Entities tracked: TASK, SCHEDULED_TASK, AD_ACCOUNT, CREATIVE
 */

// Hash function for webhook authentication (same as used elsewhere)
const hashThreeInputs = async (input1, input2, input3) => {
  const combined = input1.toString() + input2.toString() + input3.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getTodayUTC = () => {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = now.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Log a user activity event to the webhook.
 * Fire-and-forget — never blocks the caller.
 *
 * @param {Object} params
 * @param {string} params.action        - ADD | EDIT | DELETE | APPROVE
 * @param {string} params.entityType    - TASK | SCHEDULED_TASK | AD_ACCOUNT | CREATIVE
 * @param {number|string} params.entityId - ID of the affected entity
 * @param {string} [params.entityName]  - Human-readable label (campaign name, etc.)
 * @param {Object} [params.details]     - Extra context (changed fields, previous values, etc.)
 * @param {Object} [params.currentUser] - The logged-in user object
 */
export const logUserActivity = async ({
  action,
  entityType,
  entityId,
  entityName = '',
  details = {},
  currentUser = null,
}) => {
  try {
    const webhookUrl = import.meta.env.VITE_USER_ACTIVITY_WEBHOOK_URL;
    if (!webhookUrl) return;

    const adminEmail = currentUser?.email || '';
    const adminPassword = localStorage.getItem('admin_password') || '';
    const loginDate = localStorage.getItem('login_date') || getTodayUTC();
    const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

    const payload = {
      code,
      timestamp: new Date().toISOString(),
      action,           // ADD | EDIT | DELETE | APPROVE
      entity_type: entityType, // TASK | SCHEDULED_TASK | AD_ACCOUNT | CREATIVE
      entity_id: entityId,
      entity_name: entityName,
      user_id: currentUser?.id ?? null,
      user_email: adminEmail,
      user_name: currentUser?.name || '',
      user_role: currentUser?.role || '',
      details,
    };

    // Fire-and-forget: don't await, don't block the UI
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.error('Activity log webhook error:', err));
  } catch (err) {
    // Never throw — activity logging must not disrupt the app
    console.error('Activity logger error:', err);
  }
};

export default logUserActivity;
