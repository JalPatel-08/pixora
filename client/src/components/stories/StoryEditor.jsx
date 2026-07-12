import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlignCenter, AlignLeft, AlignRight, Brush, ChevronRight, Disc3, Globe, Link2, MapPin, Music, Palette, Plus, Save, Smile, Star, Trash2, Type, Undo2, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { userService } from '../../services/api';

const audiences = [{ value: 'everyone', label: 'Everyone', Icon: Globe }, { value: 'followers', label: 'Followers', Icon: Users }, { value: 'close_friends', label: 'Close friends', Icon: Star }];
const fonts = ['sans-serif', 'serif', 'cursive', 'monospace'];
const emoji = ['😀', '😍', '🔥', '✨', '😂', '💖', '👏', '🎉'];
const makeElement = (type, data = {}) => ({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, type, x: 50, y: 50, width: type === 'text' ? 48 : 24, height: 14, rotation: 0, zIndex: Date.now(), data });

const Element = ({ element, selected, onSelect, onMove }) => {
  const start = useRef(null);
  const content = element.type === 'text' ? <span style={{ color: element.data.color, fontFamily: element.data.font, textAlign: element.data.align, background: element.data.background, fontSize: `${element.data.size || 26}px` }}>{element.data.text}</span>
    : element.type === 'drawing' ? <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">{element.data.strokes?.map((stroke, index) => <polyline key={index} points={stroke.points} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" />)}</svg>
    : element.type === 'mention' ? <span className="rounded-full bg-primary px-3 py-1 font-semibold text-white">@{element.data.username}</span>
    : element.type === 'location' ? <span className="rounded-full bg-white px-3 py-1 font-semibold text-black">📍 {element.data.label}</span>
    : element.type === 'link' ? <span className="rounded-full bg-blue-500 px-3 py-1 font-semibold text-white">🔗 {element.data.label}</span>
    : element.type === 'music' ? <span className="rounded-full bg-fuchsia-600 px-3 py-1 text-white">♫ {element.data.title}</span>
    : element.type === 'gif' ? <img src={element.data.url} alt="GIF sticker" className="h-full w-full object-contain" />
    : <span className="text-4xl">{element.data.emoji}</span>;
  return <div role="button" tabIndex={0} aria-label={`${element.type} layer`} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); start.current = { x: event.clientX, y: event.clientY, elementX: element.x, elementY: element.y }; onSelect(element.id); }} onPointerMove={(event) => { if (!start.current) return; onMove(element.id, { x: Math.max(0, Math.min(100, start.current.elementX + (event.clientX - start.current.x) / 3)), y: Math.max(0, Math.min(100, start.current.elementY + (event.clientY - start.current.y) / 5)) }); }} onPointerUp={() => { start.current = null; }} className={`absolute cursor-move select-none touch-none ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, minHeight: `${element.height}%`, transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`, zIndex: element.zIndex }}>{content}</div>;
};

export const StoryEditor = ({ file, preview, draft, onPublish, onSaveDraft, onDiscard, onCancel, isUploading }) => {
  const [audience, setAudience] = useState(draft?.audience || 'everyone');
  const [elements, setElements] = useState(draft?.elements || []);
  const [active, setActive] = useState(null);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [ink, setInk] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [drawing, setDrawing] = useState(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentions, setMentions] = useState([]);
  const stageRef = useRef(null);
  const isVideo = (file?.type?.startsWith('video') || draft?.media?.mediaType === 'video');
  const source = preview || draft?.media?.url;

  const requestClose = () => {
    if (!elements.length || window.confirm('Discard this story draft and your unsaved edits?')) onCancel();
  };
  useEffect(() => { const close = (event) => event.key === 'Escape' && requestClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); });
  useEffect(() => { if (active !== 'mention' || !mentionQuery.trim()) return; const timeout = setTimeout(() => userService.search(mentionQuery).then((data) => setMentions(data.users || [])).catch(() => setMentions([])), 250); return () => clearTimeout(timeout); }, [active, mentionQuery]);

  const add = (type, data) => { const layer = makeElement(type, data); setElements((previous) => [...previous, layer]); setSelected(layer.id); };
  const update = (id, patch) => setElements((previous) => previous.map((element) => element.id === id ? { ...element, ...patch } : element));
  const selectedElement = elements.find((element) => element.id === selected);
  const moveLayer = (direction) => selectedElement && update(selected, { zIndex: selectedElement.zIndex + direction * 10000000000000 });
  const drawPoint = (event) => {
    if (!stageRef.current || !drawing) return;
    const box = stageRef.current.getBoundingClientRect(); const x = ((event.clientX - box.left) / box.width) * 100; const y = ((event.clientY - box.top) / box.height) * 100;
    setDrawing((current) => ({ ...current, points: `${current.points} ${x.toFixed(1)},${y.toFixed(1)}` }));
  };
  const finishDrawing = () => { if (drawing?.points?.trim()) add('drawing', { strokes: [{ ...drawing, points: drawing.points.trim() }] }); setDrawing(null); };
  const runPublish = () => onPublish({ file, draftId: draft?._id, audience, elements });

  return createPortal(<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-black text-white">
    <div ref={stageRef} className="absolute inset-0 overflow-hidden" onPointerMove={drawPoint} onPointerUp={finishDrawing} onPointerLeave={finishDrawing}>
      {isVideo ? <video src={source} autoPlay loop muted playsInline className="h-full w-full object-contain" /> : <img src={source} alt="Story preview" className="h-full w-full object-contain" draggable={false} />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/60" />
      {[...elements].sort((a, b) => a.zIndex - b.zIndex).map((element) => <Element key={element.id} element={element} selected={selected === element.id} onSelect={setSelected} onMove={(id, patch) => update(id, patch)} />)}
      {drawing && <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={drawing.points} fill="none" stroke={drawing.color} strokeWidth={drawing.size} strokeLinecap="round" /></svg>}
    </div>

    <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <button onClick={requestClose} disabled={isUploading} className="rounded-full bg-black/45 p-2.5" aria-label="Close story editor"><X /></button>
      <span className="font-logo text-lg">Pixora</span><div className="w-10" />
    </header>

    <aside className="absolute bottom-28 left-3 z-20 flex max-w-[calc(100vw-1.5rem)] gap-2 overflow-x-auto rounded-2xl bg-black/60 p-2 backdrop-blur md:bottom-auto md:left-auto md:right-3 md:top-1/2 md:flex-col md:-translate-y-1/2">
      {[['text', Type], ['draw', Brush], ['emoji', Smile], ['gif', Disc3], ['mention', Plus], ['location', MapPin], ['link', Link2], ['music', Music]].map(([name, Icon]) => <button key={name} onClick={() => setActive(active === name ? null : name)} className={`rounded-xl p-2.5 ${active === name ? 'bg-white text-black' : 'bg-white/10'}`} aria-label={`Add ${name}`}><Icon className="h-5 w-5" /></button>)}
    </aside>

    {active && <section className="absolute bottom-28 left-3 right-3 z-30 mx-auto max-w-md rounded-2xl bg-black/85 p-3 shadow-2xl backdrop-blur md:bottom-4 md:right-20 md:left-auto">
      {active === 'text' && <div className="space-y-2"><input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Write something" className="w-full rounded-lg bg-white/15 px-3 py-2 outline-none" /><div className="flex gap-2">{fonts.map((font) => <button key={font} onClick={() => add('text', { text: text || 'Text', color: '#ffffff', font, align: 'center', background: 'transparent', size: 26 })} className="rounded bg-white/15 px-2 py-1 text-xs" style={{ fontFamily: font }}>{font}</button>)}</div><div className="flex gap-2">{['#ffffff', '#f43f5e', '#facc15', '#22c55e', '#38bdf8'].map((color) => <button key={color} onClick={() => add('text', { text: text || 'Text', color, font: fonts[0], align: 'center', background: 'rgba(0,0,0,.4)', size: 26 })} className="h-6 w-6 rounded-full" style={{ background: color }} />)}</div></div>}
      {active === 'draw' && <div className="flex items-center gap-3"><Palette style={{ color: ink }} /><input type="color" value={ink} onChange={(e) => setInk(e.target.value)} /><input aria-label="Brush size" type="range" min="1" max="12" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} /><button onClick={() => setDrawing({ color: ink, size: brushSize, points: '' })} className="rounded bg-primary px-3 py-1.5 text-sm">Draw</button><button onClick={() => setElements((all) => all.filter((item) => item.type !== 'drawing'))} className="text-xs">Clear</button><button onClick={() => setElements((all) => { const last = [...all].reverse().find((item) => item.type === 'drawing'); return last ? all.filter((item) => item.id !== last.id) : all; })} className="text-xs">Undo</button></div>}
      {active === 'emoji' && <div className="flex flex-wrap gap-2">{emoji.map((value) => <button key={value} onClick={() => add('emoji', { emoji: value })} className="text-2xl">{value}</button>)}</div>}
      {active === 'gif' && <div className="space-y-2"><p className="text-xs text-white/70">Paste a GIF URL (GIPHY/Tenor or your hosted GIF).</p><input onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value) add('gif', { url: e.currentTarget.value }); }} placeholder="https://…gif" className="w-full rounded bg-white/15 px-3 py-2 text-sm" /></div>}
      {active === 'mention' && <div><input value={mentionQuery} onChange={(e) => setMentionQuery(e.target.value)} placeholder="Search people" className="w-full rounded bg-white/15 px-3 py-2 text-sm" />{mentions.map((person) => <button key={person._id} onClick={() => add('mention', { username: person.username, userId: person._id })} className="block w-full py-2 text-left text-sm">@{person.username}</button>)}</div>}
      {['location', 'link', 'music'].includes(active) && <input autoFocus onKeyDown={(e) => { if (e.key !== 'Enter' || !e.currentTarget.value) return; add(active, active === 'location' ? { label: e.currentTarget.value } : active === 'link' ? { label: e.currentTarget.value, url: e.currentTarget.value } : { title: e.currentTarget.value, provider: 'future-provider' }); }} placeholder={active === 'music' ? 'Song title (music playback provider-ready)' : `Add ${active}`} className="w-full rounded bg-white/15 px-3 py-2 text-sm" />}
    </section>}

    {selectedElement && <div className="absolute right-3 top-20 z-30 flex flex-col gap-2 rounded-xl bg-black/70 p-2"><button onClick={() => update(selected, { width: Math.min(100, selectedElement.width + 5), height: Math.min(100, selectedElement.height + 3) })} aria-label="Resize layer"><Plus /></button><button onClick={() => update(selected, { rotation: selectedElement.rotation + 15 })} aria-label="Rotate layer"><Undo2 className="rotate-90" /></button><button onClick={() => moveLayer(1)} aria-label="Bring layer forward">↑</button><button onClick={() => moveLayer(-1)} aria-label="Send layer backward">↓</button><button onClick={() => { setElements((all) => all.filter((item) => item.id !== selected)); setSelected(null); }} aria-label="Delete layer"><Trash2 /></button></div>}

    <footer className="absolute inset-x-0 bottom-0 z-20 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/85 to-transparent"><div className="mx-auto flex max-w-xl items-center gap-2"><select value={audience} onChange={(e) => setAudience(e.target.value)} className="rounded-full bg-black/50 px-3 py-2 text-sm">{audiences.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select>{draft && <button onClick={() => { if (window.confirm('Discard this saved draft?')) onDiscard?.(); }} disabled={isUploading} className="rounded-full bg-red-500/70 px-3 py-2 text-sm">Discard</button>}<button onClick={() => onSaveDraft?.({ file, draftId: draft?._id, audience, elements })} disabled={isUploading} className="ml-auto rounded-full bg-white/15 px-3 py-2 text-sm"><Save className="mr-1 inline h-4" />Save draft</button><button onClick={runPublish} disabled={isUploading} className="rounded-full bg-primary px-4 py-2 font-semibold">{isUploading ? 'Saving…' : 'Share'} <ChevronRight className="inline h-4" /></button></div></footer>
  </motion.div>, document.body);
};
