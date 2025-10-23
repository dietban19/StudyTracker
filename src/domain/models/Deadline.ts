import { Event } from './Event';

export class Deadline {
  public readonly id: string;
  public readonly courseId: string;
  public readonly type: string;
  public readonly color: string;
  public readonly createdAt: Date | null;
  public readonly updatedAt: Date | null;
  public readonly dueAt: Date | null;
  public readonly title: string;

  // store as a private member and expose via a getter
  private event: Event | null;

  constructor({
    id,
    courseId,
    type,
    color,
    createdAt,
    title,
    updatedAt,
    dueAt,
  }: {
    id: string;
    courseId: string;
    type: string;
    color: string;
    createdAt: { seconds: number; nanoseconds: number } | null;
    title: string;
    updatedAt: { seconds: number; nanoseconds: number } | null;
    dueAt: { seconds: number; nanoseconds: number } | null;
  }) {
    this.id = id;
    this.courseId = courseId;
    this.type = type;
    this.color = color;
    this.createdAt = Deadline.toDate(createdAt);
    this.updatedAt = Deadline.toDate(updatedAt);
    this.dueAt = Deadline.toDate(dueAt);
    this.title = title;

    this.event = this.dueAt
      ? new Event(
          this.id,
          this.title,
          this.dueAt,
          this.color,
          this.courseId,
          'deadline',
        )
      : null;
  }

  static toDate(
    ts: { seconds: number; nanoseconds: number } | null,
  ): Date | null {
    if (!ts || typeof ts.seconds !== 'number') return null;
    return new Date(ts.seconds * 1000 + Math.floor(ts.nanoseconds / 1e6));
  }

  public getEvent() {
    return this.event;
  }
  public getCourseId() {
    return this.courseId;
  }
}
