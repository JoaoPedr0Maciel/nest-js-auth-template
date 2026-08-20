import { Ability } from '@casl/ability';
import { Action } from './actions';
import { Subject } from './subjects';

export type AppAbility = Ability<[Action, Subject]>;
