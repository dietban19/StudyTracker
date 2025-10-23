export type ID = string;

export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  Done = 'done',
}
export enum Priority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}
export enum DeadlineType {
  Assignment = 'assignment',
  Exam = 'exam',
  Quiz = 'quiz',
  Project = 'project',
  Other = 'other',
}
