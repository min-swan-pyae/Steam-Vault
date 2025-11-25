import { EventEmitter } from 'events';

const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

export const EVENT_TOPICS = {
  FORUM: 'forum:event'
};

export default eventBus;
