import { Person } from "./Person";

export interface PersonView {
  person: Person;
  counts: PersonAggregates;
  is_admin: boolean;
}

export interface PersonAggregates {
  post_count: number;
  comment_count: number;
}
