import { all, now, one, run, uid } from "@/lib/db";

/**
 * The topic queue. Kept in the database rather than in a file because it is
 * working state, not content. The generator takes the oldest queued topic each
 * run, which stops it writing the same article five different ways.
 */
export type Topic = {
  id: string; title: string; angle: string; category: string;
  status: string; created_at: string; used_at: string | null;
};

export const allTopics = () => all<Topic>("SELECT * FROM blog_topics ORDER BY status, created_at");
export const queuedTopics = () => all<Topic>("SELECT * FROM blog_topics WHERE status = 'queued' ORDER BY created_at");
export const nextTopic = () => one<Topic>("SELECT * FROM blog_topics WHERE status = 'queued' ORDER BY created_at LIMIT 1");
export const getTopic = (id: string) => one<Topic>("SELECT * FROM blog_topics WHERE id = ?", id);

export function addTopic(title: string, angle: string, category: string) {
  run(
    "INSERT INTO blog_topics (id, title, angle, category, status, created_at) VALUES (?,?,?,?,'queued',?)",
    uid(), title, angle, category, now(),
  );
}

export const markTopic = (id: string, status: string) =>
  run("UPDATE blog_topics SET status = ?, used_at = ? WHERE id = ?", status, now(), id);

export const deleteTopic = (id: string) => run("DELETE FROM blog_topics WHERE id = ?", id);
