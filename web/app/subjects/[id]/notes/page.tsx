import NoteEntryForm from "./NoteEntryForm";

export default async function NoteEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoteEntryForm subjectId={id} />;
}
