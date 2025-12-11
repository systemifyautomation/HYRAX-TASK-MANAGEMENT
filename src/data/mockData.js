// Mock data for the HYRAX task management app
import { USER_ROLES } from '../constants/roles';

export const users = [
  { id: 1, name: 'John Doe', role: USER_ROLES.MANAGER, email: 'john@hyrax.com', avatar: 'JD' },
  { id: 2, name: 'Sarah Smith', role: USER_ROLES.TEAM_MEMBER, email: 'sarah@hyrax.com', avatar: 'SS' },
  { id: 3, name: 'Mike Johnson', role: USER_ROLES.TEAM_MEMBER, email: 'mike@hyrax.com', avatar: 'MJ' },
  { id: 4, name: 'Emily Brown', role: USER_ROLES.TEAM_MEMBER, email: 'emily@hyrax.com', avatar: 'EB' },
  { id: 5, name: 'David Lee', role: USER_ROLES.MANAGER, email: 'david@hyrax.com', avatar: 'DL' },
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

export const taskPriority = {
  URGENT: 'urgent',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
};

export const taskTags = [
  'Social Media',
  'Paid Ads',
  'Email',
  'Design',
  'Video',
  'Copywriting',
  'Research',
  'Strategy',
];

// Spreadsheet columns configuration
export const columns = [
  { id: 'title', key: 'title', name: 'Title', type: 'text', canDelete: false },
  { id: 'status', key: 'status', name: 'Status', type: 'dropdown', options: ['not_started', 'in_progress', 'submitted', 'needs_revision', 'approved'], canDelete: false },
  { id: 'assignedTo', key: 'assignedTo', name: 'Assigned To', type: 'user', canDelete: false },
  { id: 'campaignId', key: 'campaignId', name: 'Campaign', type: 'campaign', canDelete: false },
  { id: 'dueDate', key: 'dueDate', name: 'Due Date', type: 'date', canDelete: false },
  { id: 'priority', key: 'priority', name: 'Priority', type: 'dropdown', options: ['urgent', 'high', 'normal', 'low'], canDelete: false },
  { id: 'type', key: 'type', name: 'Type', type: 'dropdown', options: ['copy', 'image', 'video', 'script'], canDelete: false },
  { id: 'description', key: 'description', name: 'Description', type: 'text', canDelete: false },
];

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
    status: taskStatus.SUBMITTED,
    priority: taskPriority.HIGH,
  },
  {
    id: 2,
    campaignId: 1,
    title: 'Hero Image Design',
    type: taskTypes.IMAGE,
    description: 'Create hero banner image for the campaign',
    assignedTo: 3,
    dueDate: '2024-12-14',
    status: taskStatus.APPROVED,
    priority: taskPriority.URGENT,
  },
  {
    id: 3,
    campaignId: 1,
    title: 'Product Showcase Video',
    type: taskTypes.VIDEO,
    description: '30-second product showcase video',
    assignedTo: 4,
    dueDate: '2024-12-15',
    status: taskStatus.IN_PROGRESS,
    priority: taskPriority.HIGH,
  },
  {
    id: 4,
    campaignId: 1,
    title: 'Retargeting Ad Copy',
    type: taskTypes.COPY,
    description: 'Copy for retargeting ads',
    assignedTo: 2,
    dueDate: '2024-12-16',
    status: taskStatus.NOT_STARTED,
    priority: taskPriority.NORMAL,
  },
  {
    id: 5,
    campaignId: 1,
    title: 'Social Media Carousel Images',
    type: taskTypes.IMAGE,
    description: 'Create 5 carousel images for Instagram',
    assignedTo: 3,
    dueDate: '2024-12-17',
    status: taskStatus.NEEDS_REVISION,
    priority: taskPriority.HIGH,
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
    status: taskStatus.SUBMITTED,
    priority: taskPriority.URGENT,
  },
  {
    id: 7,
    campaignId: 2,
    title: 'Holiday Ad Copy Set',
    type: taskTypes.COPY,
    description: 'Create 3 variations of holiday ad copy',
    assignedTo: 4,
    dueDate: '2024-12-19',
    status: taskStatus.IN_PROGRESS,
    priority: taskPriority.HIGH,
  },
  {
    id: 8,
    campaignId: 2,
    title: 'Holiday Banner Images',
    type: taskTypes.IMAGE,
    description: 'Design festive banner images',
    assignedTo: 3,
    dueDate: '2024-12-20',
    status: taskStatus.NOT_STARTED,
    priority: taskPriority.NORMAL,
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
    status: taskStatus.APPROVED,
    priority: taskPriority.URGENT,
  },
  {
    id: 10,
    campaignId: 3,
    title: 'Product Demo Video',
    type: taskTypes.VIDEO,
    description: 'Create product demonstration video',
    assignedTo: 4,
    dueDate: '2024-12-12',
    status: taskStatus.APPROVED,
    priority: taskPriority.HIGH,
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
    status: taskStatus.NOT_STARTED,
    priority: taskPriority.NORMAL,
  },
  {
    id: 12,
    campaignId: 4,
    title: 'Brand Story Video Script',
    type: taskTypes.SCRIPT,
    description: 'Write compelling brand story script',
    assignedTo: 4,
    dueDate: '2024-12-27',
    status: taskStatus.NOT_STARTED,
    priority: taskPriority.LOW,
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
