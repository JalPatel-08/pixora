import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { storyService } from '../../services/api';

const HighlightViewer = ({ highlight, onClose }) => {
  const [index, setIndex] = useState(0);
  const story = highlight.stories?.[index];
  if (!story) return null;
  const previous = () => setIndex((value) => Math.max(0, value - 1));
  const next = () => index === highlight.stories.length - 1 ? onClose() : setIndex((value) => value + 1);
  return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-0 sm:p-5" onClick={onClose}>
    <div className="relative h-full w-full max-w-sm overflow-hidden bg-black sm:h-[80dvh] sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="absolute inset-x-3 top-3 z-20 flex gap-1">{highlight.stories.map((item, itemIndex) => <span key={item._id} className={`h-0.5 flex-1 rounded ${itemIndex <= index ? 'bg-white' : 'bg-white/30'}`} />)}</div>
      <button onClick={onClose} className="absolute right-3 top-6 z-20 rounded-full bg-black/40 p-2 text-white" aria-label="Close highlight"><X className="h-5 w-5" /></button>
      {story.media.mediaType === 'video' ? <video src={story.media.url} autoPlay controls playsInline className="h-full w-full object-contain" /> : <img src={story.media.url} alt="Highlight story" className="h-full w-full object-contain" />}
      <button onClick={previous} className="absolute inset-y-0 left-0 z-10 w-1/2" aria-label="Previous story" /><button onClick={next} className="absolute inset-y-0 right-0 z-10 w-1/2" aria-label="Next story" />
      {index > 0 && <ChevronLeft className="pointer-events-none absolute left-3 top-1/2 z-20 text-white" />} {index < highlight.stories.length - 1 && <ChevronRight className="pointer-events-none absolute right-3 top-1/2 z-20 text-white" />}
    </div>
  </div>;
};

const HighlightEditor = ({ highlight, archive, onClose }) => {
  const client = useQueryClient();
  const [title, setTitle] = useState(highlight?.title || '');
  const [selected, setSelected] = useState(highlight?.stories?.map((story) => story._id) || []);
  const [coverUrl, setCoverUrl] = useState(highlight?.coverUrl || '');
  const save = useMutation({ mutationFn: () => highlight ? storyService.updateHighlight(highlight._id, { title, storyIds: selected, coverUrl }) : storyService.createHighlight({ title, storyIds: selected, coverUrl }), onSuccess: () => { client.invalidateQueries({ queryKey: ['storyHighlights'] }); onClose(); } });
  const remove = useMutation({ mutationFn: () => storyService.deleteHighlight(highlight._id), onSuccess: () => { client.invalidateQueries({ queryKey: ['storyHighlights'] }); onClose(); } });
  const selectedStories = archive.filter((story) => selected.includes(story._id));
  return <div className="fixed inset-0 z-[9999] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
    <div className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-card p-4 text-text sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{highlight ? 'Edit highlight' : 'New highlight'}</h2><button onClick={onClose}><X /></button></div>
      <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={30} placeholder="Highlight name" className="mb-4 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      {selectedStories.length > 0 && <><p className="mb-2 text-xs font-semibold text-text-secondary">Choose cover</p><div className="mb-4 flex gap-2 overflow-x-auto">{selectedStories.map((story) => <button key={story._id} onClick={() => setCoverUrl(story.media.url)} className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-full ${coverUrl === story.media.url ? 'ring-2 ring-primary' : ''}`}>{story.media.mediaType === 'video' ? <video src={story.media.url} className="h-full w-full object-cover" muted /> : <img src={story.media.url} alt="Cover option" className="h-full w-full object-cover" />}</button>)}</div></>}
      <p className="mb-2 text-xs font-semibold text-text-secondary">Archived stories</p><div className="grid grid-cols-3 gap-2">{archive.map((story) => <button key={story._id} onClick={() => setSelected((items) => items.includes(story._id) ? items.filter((id) => id !== story._id) : [...items, story._id])} className={`relative aspect-[9/16] overflow-hidden rounded-lg ${selected.includes(story._id) ? 'ring-2 ring-primary' : ''}`}>{story.media.mediaType === 'video' ? <video src={story.media.url} className="h-full w-full object-cover" muted /> : <img src={story.media.url} alt="Archived story" className="h-full w-full object-cover" />}</button>)}</div>
      <div className="mt-5 flex items-center gap-2">{highlight && <button onClick={() => window.confirm(`Delete ${highlight.title}?`) && remove.mutate()} className="rounded-xl px-3 py-2 text-sm text-danger"><Trash2 className="mr-1 inline h-4" />Delete</button>}<button disabled={!title.trim() || !selected.length || save.isPending} onClick={() => save.mutate()} className="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save highlight'}</button></div>
    </div>
  </div>;
};

export const StoryHighlights = ({ username, isOwn }) => {
  const [viewing, setViewing] = useState(null); const [editing, setEditing] = useState(undefined);
  const { data } = useQuery({ queryKey: ['storyHighlights', username], queryFn: () => storyService.getHighlights(username), enabled: !!username });
  const { data: archiveData } = useQuery({ queryKey: ['storyArchive'], queryFn: storyService.getArchive, enabled: isOwn && editing !== undefined });
  const highlights = data?.highlights || []; const archive = archiveData?.stories || [];
  return <section className="border-b border-border px-4 pb-5 pt-1"><div className="flex gap-4 overflow-x-auto pb-1 hide-scrollbar">{isOwn && <button onClick={() => setEditing(null)} className="flex w-16 flex-shrink-0 flex-col items-center gap-1.5"><span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-text-secondary"><Plus className="h-5" /></span><span className="w-full truncate text-xs text-text-secondary">New</span></button>}{highlights.map((highlight) => <div key={highlight._id} className="relative flex w-16 flex-shrink-0 flex-col items-center gap-1.5"><button onClick={() => setViewing(highlight)} className="h-16 w-16 overflow-hidden rounded-full border-2 border-border p-0.5">{highlight.coverUrl ? <img src={highlight.coverUrl} alt={highlight.title} className="h-full w-full rounded-full object-cover" /> : <span className="flex h-full items-center justify-center rounded-full bg-surface text-xs">Story</span>}</button><span className="w-full truncate text-center text-xs text-text">{highlight.title}</span>{isOwn && <button onClick={() => setEditing(highlight)} className="absolute right-0 top-11 rounded-full bg-card p-1 shadow"><Pencil className="h-3 w-3" /></button>}</div>)}</div><AnimatePresence>{viewing && <HighlightViewer highlight={viewing} onClose={() => setViewing(null)} />}</AnimatePresence>{editing !== undefined && <HighlightEditor highlight={editing} archive={archive} onClose={() => setEditing(undefined)} />}</section>;
};
