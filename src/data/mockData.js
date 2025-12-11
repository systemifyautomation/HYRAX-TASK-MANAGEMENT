// Mock data for the HYRAX task management app

export const users = [
  { id: 1, name: 'John Doe', role: 'manager', email: 'john@hyrax.com', avatar: 'JD' },
  { id: 2, name: 'Sarah Smith', role: 'team_member', email: 'sarah@hyrax.com', avatar: 'SS' },
  { id: 3, name: 'Mike Johnson', role: 'team_member', email: 'mike@hyrax.com', avatar: 'MJ' },
  { id: 4, name: 'Emily Brown', role: 'team_member', email: 'emily@hyrax.com', avatar: 'EB' },
  { id: 5, name: 'David Lee', role: 'manager', email: 'david@hyrax.com', avatar: 'DL' },
];

export const campaigns = [
  {
    id: 1,
    name: 'Summer Sale 2024',
    client: 'Fashion Brand Co.',
    startDate: '2024-12-09',
    endDate: '2024-12-23',
    status: 'active',
    budget: '$50,000',
    platform: 'Facebook & Instagram',
  },
  {
    id: 2,
    name: 'Holiday Campaign',
    client: 'Tech Gadgets Inc.',
    startDate: '2024-12-16',
    endDate: '2024-12-30',
    status: 'active',
    budget: '$75,000',
    platform: 'Facebook',
  },
  {
    id: 3,
    name: 'New Product Launch',
    client: 'Cosmetics Plus',
    startDate: '2024-12-02',
    endDate: '2024-12-16',
    status: 'completed',
    budget: '$35,000',
    platform: 'Instagram',
  },
  {
    id: 4,
    name: 'Brand Awareness Q1',
    client: 'Fitness Studio',
    startDate: '2024-12-23',
    endDate: '2025-01-06',
    status: 'planning',
    budget: '$25,000',
    platform: 'Facebook & Instagram',
  },
];

export const taskTypes = {
  COPY: 'copy',
  IMAGE: 'image',
  VIDEO: 'video',
  SCRIPT: 'script',
};

export const taskStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  NEEDS_REVISION: 'needs_revision',
  APPROVED: 'approved',
};

export const tasks = [
  // Campaign 1 - Summer Sale 2024
  {
    id: 1,
    campaignId: 1,
    title: 'Ad Copy - Main Campaign',
    type: taskTypes.COPY,
    description: 'Write engaging copy for main summer sale ads',
    assignedTo: 2,
    dueDate: '2024-12-13',
    weekNumber: 50,
    status: taskStatus.SUBMITTED,
    submittedContent: 'Summer is here! Get up to 50% off on all fashion items. Limited time offer!',
    submittedAt: '2024-12-11T10:30:00',
    feedback: null,
  },
  {
    id: 2,
    campaignId: 1,
    title: 'Hero Image Design',
    type: taskTypes.IMAGE,
    description: 'Create hero banner image for the campaign',
    assignedTo: 3,
    dueDate: '2024-12-14',
    weekNumber: 50,
    status: taskStatus.APPROVED,
    submittedContent: 'https://via.placeholder.com/1200x628/0ea5e9/ffffff?text=Summer+Sale+Hero+Image',
    submittedAt: '2024-12-10T14:20:00',
    feedback: 'Looks great! Approved.',
    approvedAt: '2024-12-11T09:00:00',
    approvedBy: 1,
  },
  {
    id: 3,
    campaignId: 1,
    title: 'Product Showcase Video',
    type: taskTypes.VIDEO,
    description: '30-second product showcase video',
    assignedTo: 4,
    dueDate: '2024-12-15',
    weekNumber: 50,
    status: taskStatus.IN_PROGRESS,
    submittedContent: null,
    submittedAt: null,
    feedback: null,
  },
  {
    id: 4,
    campaignId: 1,
    title: 'Retargeting Ad Copy',
    type: taskTypes.COPY,
    description: 'Copy for retargeting ads',
    assignedTo: 2,
    dueDate: '2024-12-16',
    weekNumber: 51,
    status: taskStatus.NOT_STARTED,
    submittedContent: null,
    submittedAt: null,
    feedback: null,
  },
  {
    id: 5,
    campaignId: 1,
    title: 'Social Media Carousel Images',
    type: taskTypes.IMAGE,
    description: 'Create 5 carousel images for Instagram',
    assignedTo: 3,
    dueDate: '2024-12-17',
    weekNumber: 51,
    status: taskStatus.NEEDS_REVISION,
    submittedContent: 'https://via.placeholder.com/1080x1080/bae6fd/075985?text=Carousel+Images',
    submittedAt: '2024-12-10T16:45:00',
    feedback: 'Please adjust colors to match brand guidelines',
    reviewedAt: '2024-12-11T11:00:00',
    reviewedBy: 1,
  },

  // Campaign 2 - Holiday Campaign
  {
    id: 6,
    campaignId: 2,
    title: 'Holiday Video Script',
    type: taskTypes.SCRIPT,
    description: 'Write script for 60-second holiday video',
    assignedTo: 2,
    dueDate: '2024-12-18',
    weekNumber: 51,
    status: taskStatus.SUBMITTED,
    submittedContent: 'Scene 1: Family gathering around holiday table...\nScene 2: Unboxing our product...',
    submittedAt: '2024-12-11T08:15:00',
    feedback: null,
  },
  {
    id: 7,
    campaignId: 2,
    title: 'Holiday Ad Copy Set',
    type: taskTypes.COPY,
    description: 'Create 3 variations of holiday ad copy',
    assignedTo: 4,
    dueDate: '2024-12-19',
    weekNumber: 51,
    status: taskStatus.IN_PROGRESS,
    submittedContent: null,
    submittedAt: null,
    feedback: null,
  },
  {
    id: 8,
    campaignId: 2,
    title: 'Holiday Banner Images',
    type: taskTypes.IMAGE,
    description: 'Design festive banner images',
    assignedTo: 3,
    dueDate: '2024-12-20',
    weekNumber: 51,
    status: taskStatus.NOT_STARTED,
    submittedContent: null,
    submittedAt: null,
    feedback: null,
  },

  // Campaign 3 - New Product Launch
  {
    id: 9,
    campaignId: 3,
    title: 'Launch Announcement Copy',
    type: taskTypes.COPY,
    description: 'Write copy for product launch announcement',
    assignedTo: 2,
    dueDate: '2024-12-10',
    weekNumber: 50,
    status: taskStatus.APPROVED,
    submittedContent: 'Introducing our latest innovation! Revolutionary features that will change everything.',
    submittedAt: '2024-12-08T13:00:00',
    feedback: 'Perfect! Approved.',
    approvedAt: '2024-12-09T09:30:00',
    approvedBy: 5,
  },
  {
    id: 10,
    campaignId: 3,
    title: 'Product Demo Video',
    type: taskTypes.VIDEO,
    description: 'Create product demonstration video',
    assignedTo: 4,
    dueDate: '2024-12-12',
    weekNumber: 50,
    status: taskStatus.APPROVED,
    submittedContent: 'https://via.placeholder.com/1920x1080/0ea5e9/ffffff?text=Product+Demo+Video',
    submittedAt: '2024-12-09T10:00:00',
    feedback: 'Great work!',
    approvedAt: '2024-12-10T14:00:00',
    approvedBy: 5,
  },

  // Campaign 4 - Brand Awareness Q1
  {
    id: 11,
    campaignId: 4,
    title: 'Q1 Campaign Strategy',
    type: taskTypes.COPY,
    description: 'Outline the content strategy for Q1',
    assignedTo: 2,
    dueDate: '2024-12-25',
    weekNumber: 52,
    status: taskStatus.NOT_STARTED,
    submittedContent: null,
    submittedAt: null,
    feedback: null,
  },
  {
    id: 12,
    campaignId: 4,
    title: 'Brand Story Video Script',
    type: taskTypes.SCRIPT,
    description: 'Write compelling brand story script',
    assignedTo: 4,
    dueDate: '2024-12-27',
    weekNumber: 52,
    status: taskStatus.NOT_STARTED,
    submittedContent: null,
    submittedAt: null,
    feedback: null,
  },
];

// Helper function to get current user (in real app, this would come from auth)
export const getCurrentUser = () => users[0]; // Default to manager for demo

// Helper function to get tasks for a user
export const getTasksForUser = (userId) => {
  return tasks.filter(task => task.assignedTo === userId);
};

// Helper function to get tasks by campaign
export const getTasksByCampaign = (campaignId) => {
  return tasks.filter(task => task.campaignId === campaignId);
};

// Helper function to get tasks by week
export const getTasksByWeek = (weekNumber) => {
  return tasks.filter(task => task.weekNumber === weekNumber);
};

// Helper function to get user by id
export const getUserById = (userId) => {
  return users.find(user => user.id === userId);
};

// Helper function to get campaign by id
export const getCampaignById = (campaignId) => {
  return campaigns.find(campaign => campaign.id === campaignId);
};

// Helper function to get current week number
export const getCurrentWeekNumber = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};

// Helper function to get week range
export const getWeekRange = (weekNumber) => {
  // Simplified - in production, would calculate actual dates
  return `Week ${weekNumber}`;
};
