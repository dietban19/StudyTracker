// src/domain/models/Course.ts
import { ID } from './types';

export class Course {
  constructor(
    public readonly id: ID,
    public name: string,
    public termId: ID,
    public code?: string,
    public color?: string,
  ) {}

  rename(v: string) {
    this.name = v;
  }

  static fromJSON(id: ID, json: any): Course {
    return new Course(
      id,
      json.name,
      json.termId,
      json.code ?? undefined,
      json.color ?? undefined,
    );
  }

  toJSON() {
    return {
      name: this.name,
      termId: this.termId,
      code: this.code ?? null,
      color: this.color ?? null,
    };
  }
}
