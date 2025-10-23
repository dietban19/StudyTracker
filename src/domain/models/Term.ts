import { ID } from './types';

export class Term {
  constructor(
    public readonly id: ID,
    public name: string, // e.g., "Fall 2025" or "Exam Prep"
    public startDate?: string, // ISO date, optional
    public endDate?: string, // ISO date, optional
    public archived: boolean = false,
  ) {}

  archive() {
    this.archived = true;
  }

  static fromJSON(id: ID, json: any): Term {
    return new Term(
      id,
      json.name,
      json.startDate,
      json.endDate,
      !!json.archived,
    );
  }

  toJSON() {
    return {
      name: this.name,
      startDate: this.startDate ?? null,
      endDate: this.endDate ?? null,
      archived: this.archived,
    };
  }
}
