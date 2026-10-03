// Seeds (or removes) fake demo data for the local-only demo login.
// Usage: node --env-file=.env scripts/demo-data.mjs seed|clean
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const USER_ID = "demo-local";
const sql = neon(process.env.DATABASE_URL);

const NOTES = [
  {
    week: 1,
    topic: "Greetings",
    text: ["hola : OH-lah : hello", "buenos días : BWAY-nohs DEE-ahs : good morning", "buenas noches : BWAY-nahs NOH-chehs : good night", "¿cómo estás? : KOH-moh ehs-TAHS : how are you?", "mucho gusto : MOO-choh GOOS-toh : nice to meet you", "adiós : ah-DYOHS : goodbye"],
    streak: 3,
    dueInDays: 4,
  },
  {
    week: 2,
    topic: "Food & drink",
    text: ["el agua : el AH-gwah : water", "el pan : el pahn : bread", "la manzana : lah mahn-SAH-nah : apple", "el queso : el KEH-soh : cheese", "quiero un café : KYEH-roh oon kah-FEH : I would like a coffee", "la cuenta, por favor : lah KWEN-tah por fah-VOR : the bill, please"],
    streak: 1,
    dueInDays: -1,
  },
  {
    week: 3,
    topic: "Travel",
    text: ["la estación : lah ehs-tah-SYOHN : station", "el aeropuerto : el ah-eh-roh-PWEHR-toh : airport", "¿dónde está el baño? : DOHN-deh ehs-TAH el BAH-nyoh : where is the bathroom?", "a la izquierda : ah lah ees-KYEHR-dah : to the left", "a la derecha : ah lah deh-REH-chah : to the right", "el billete : el bee-YEH-teh : ticket"],
    streak: 0,
    dueInDays: -2,
  },
];

async function clean() {
  await sql`DELETE FROM subjects WHERE user_id = ${USER_ID}`;
}

async function seed() {
  await clean();
  const subjectId = randomUUID();
  await sql`INSERT INTO subjects (id, user_id, name) VALUES (${subjectId}, ${USER_ID}, ${"Spanish"})`;

  for (const n of NOTES) {
    const noteId = randomUUID();
    const text = n.text.join("\n");
    await sql`INSERT INTO weekly_notes (id, subject_id, week_number, raw_text, source_type) VALUES (${noteId}, ${subjectId}, ${n.week}, ${text}, ${"ocr"})`;
    await sql`INSERT INTO chunks (id, note_id, subject_id, text, embedding, topic, week_number) VALUES (${randomUUID()}, ${noteId}, ${subjectId}, ${text}, ${JSON.stringify([])}::jsonb, ${n.topic}, ${n.week})`;
    const due = new Date(Date.now() + n.dueInDays * 86400000).toISOString();
    await sql`INSERT INTO topic_mastery (subject_id, topic, correct_streak, last_reviewed, next_due_date) VALUES (${subjectId}, ${n.topic}, ${n.streak}, now(), ${due})`;
  }
}

const cmd = process.argv[2];
if (cmd === "seed") await seed();
else if (cmd === "clean") await clean();
else throw new Error("Usage: demo-data.mjs seed|clean");
const [{ count }] = await sql`SELECT count(*)::int AS count FROM subjects WHERE user_id = ${USER_ID}`;
console.log(`${cmd} done — demo subjects now: ${count}`);
