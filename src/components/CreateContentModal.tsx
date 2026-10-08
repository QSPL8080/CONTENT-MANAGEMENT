import React, { useState } from 'react';
import { localDateStr } from '../lib/dates';
import { User, ContentType, Platform, ContentItem, ContentStatus } from '../types';
import { isCreator, isPoster, roleLabel } from '../lib/roles';
import { X, Plus, Film, Calendar, Clock, UserCheck, FileText, Hash, Check } from 'lucide-react';

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  defaultDate?: string;
  defaultContentType?: ContentType;
  /** When provided, the modal edits this item instead of creating a new one. */
  initialContent?: ContentItem;
  onCreate: (data: Partial<ContentItem>) => Promise<void>;
}

const DESIGN_TYPES: ContentType[] = ['carousel', 'static', 'story', 'announcement', 'thread'];

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'EDITING', label: 'Editing' },
  { value: 'READY_TO_POST', label: 'Ready to Post' },
  { value: 'REVISION', label: 'Revision' },
  { value: 'ISSUE', label: 'Issue' },
];

export const CreateContentModal: React.FC<CreateContentModalProps> = ({
  isOpen,
  onClose,
  users,
  defaultDate,
  defaultContentType,
  initialContent,
  onCreate,
}) => {
  const isEdit = Boolean(initialContent);
  const active = users.filter(u => u.status === 'active');

  // Creators = Graphic Designers + Video Editors; posting = Interns.
  // If a role has nobody yet, fall back to every active member so content can still be planned.
  const designers = active.filter(u => u.role === 'graphic_designer');
  const videoEditors = active.filter(u => u.role === 'editor');
  const creatorPool = active.filter(u => isCreator(u.role));
  const otherCreators = creatorPool.length > 0 ? [] : active;
  const interns = active.filter(u => isPoster(u.role));
  const posters = interns.length > 0 ? interns : active;

  // Keep the currently assigned person selectable even if they were since disabled/re-roled
  const extraAssignee = (id?: string) => {
    if (!id) return null;
    const u = users.find(x => x.id === id);
    return u && !active.some(a => a.id === id) ? u : null;
  };

  const pickDefaultCreator = (type: ContentType) => {
    const preferred = DESIGN_TYPES.includes(type) ? designers : videoEditors;
    return (preferred[0] || creatorPool[0] || active[0])?.id || '';
  };

  const initialType = initialContent?.content_type || defaultContentType || 'reel';
  const [title, setTitle] = useState(initialContent?.title || '');
  const [description, setDescription] = useState(initialContent?.description || '');
  const [contentType, setContentType] = useState<ContentType>(initialType);
  const [category, setCategory] = useState<string>(initialContent?.category || 'Education');
  const [platform, setPlatform] = useState<Platform>(initialContent?.platform || 'instagram');
  const [scheduledDate, setScheduledDate] = useState(initialContent?.scheduled_date || defaultDate || localDateStr());
  const [scheduledTime, setScheduledTime] = useState((initialContent?.scheduled_time || '18:00').slice(0, 5));
  const [editorId, setEditorId] = useState(initialContent?.editor_id || pickDefaultCreator(initialType));
  const [editorTouched, setEditorTouched] = useState(isEdit);
  // Intern is optional: content can be created first and the intern assigned later
  const [posterId, setPosterId] = useState(initialContent?.poster_id || '');
  const [caption, setCaption] = useState(initialContent?.caption || '');
  const [hashtags, setHashtags] = useState(initialContent?.hashtags || '');
  const [tagsText, setTagsText] = useState((initialContent?.tags || []).join(', '));
  const [status, setStatus] = useState<ContentStatus>(initialContent?.status || 'PLANNED');
  const [instructions, setInstructions] = useState(
    initialContent?.instructions ?? 'Post as Instagram Reel. Use cover frame with bold title. Add specified caption.'
  );
  const [referenceNotes, setReferenceNotes] = useState(initialContent?.reference_notes || '');
  const [internalNotes, setInternalNotes] = useState(initialContent?.internal_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync defaultContentType and defaultDate if they change when opened
  React.useEffect(() => {
    if (isEdit) return;
    if (defaultContentType) setContentType(defaultContentType);
    if (defaultDate) setScheduledDate(defaultDate);
  }, [defaultContentType, defaultDate, isOpen, isEdit]);

  // New content: suggest a Graphic Designer for design formats and a Video Editor for video formats
  React.useEffect(() => {
    if (!isEdit && !editorTouched) setEditorId(pickDefaultCreator(contentType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledDate || !scheduledTime || !editorId) {
      setError('Please fill out all required fields (title, date, time and designer/editor).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
      await onCreate({
        ...(isEdit && status !== initialContent?.status ? { status } : {}),
        tags,
        title: title.trim(),
        description: description.trim(),
        content_type: contentType,
        category: category.trim() || undefined,
        platform,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        editor_id: editorId,
        poster_id: posterId, // '' = no intern yet
        caption: caption.trim(),
        hashtags: hashtags.trim(),
        instructions: instructions.trim(),
        reference_notes: referenceNotes.trim() || (isEdit ? '' : undefined),
        internal_notes: internalNotes.trim() || (isEdit ? '' : undefined),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || (isEdit ? 'Failed to save changes' : 'Failed to create content'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl xl:max-w-3xl w-full min-w-0 shadow-2xl border border-slate-200 overflow-hidden h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">{isEdit ? 'Edit Content' : 'Create New Content'}</h3>
              <p className="text-xs text-slate-500">
                {isEdit ? 'Changes are logged in the activity history' : 'Plan a post for design/editing and publishing'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-900 inline-block" />
              1. Basic Information
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Content Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3 AI Tools Every Founder Needs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brief / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Core topic, hook angle, and goals for this video..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Platform <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube_shorts">YouTube Shorts</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X (Twitter)</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Content Type
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as ContentType)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                  >
                    <option value="reel">Reel</option>
                    <option value="carousel">Carousel Post</option>
                    <option value="story">Story</option>
                    <option value="thread">Threads Post</option>
                    <option value="announcement">Announcement</option>
                    <option value="short">Short Video</option>
                    <option value="static">Static Post</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category / Theme
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Education, Engagement, Promo..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {['Education', 'Engagement', 'Promo', 'Behind-the-Scenes', 'Product'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          category === cat
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tags (Optional, comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Campaign, Tutorial, Launch"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Useful for filtering by tags in calendar view</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduled Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduled Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Assignment */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-900 inline-block" />
              2. Responsibility &amp; Assignment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designer / Video Editor <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editorId}
                  onChange={(e) => {
                    setEditorId(e.target.value);
                    setEditorTouched(true);
                  }}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  {!editorId && <option value="">Select…</option>}
                  {extraAssignee(editorId) && (
                    <option value={editorId}>{extraAssignee(editorId)!.name} (currently assigned)</option>
                  )}
                  {designers.length > 0 && (
                    <optgroup label="Graphic Designers">
                      {designers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {videoEditors.length > 0 && (
                    <optgroup label="Video Editors">
                      {videoEditors.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {otherCreators.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({roleLabel(u.role)})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Uploads the final file and hands it off to the intern.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intern (publishes it) <span className="text-slate-400 font-normal">— optional</span>
                </label>
                <select
                  value={posterId}
                  onChange={(e) => setPosterId(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="">Not assigned yet</option>
                  {extraAssignee(posterId) && (
                    <option value={posterId}>{extraAssignee(posterId)!.name} (currently assigned)</option>
                  )}
                  {posters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{interns.length === 0 ? ` (${roleLabel(p.role)})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Downloads, publishes and marks it as posted. You can assign the intern later by editing.</p>
              </div>
            </div>
          </div>

          {isEdit && initialContent && (
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              {initialContent.status === 'POSTED' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContentStatus)}
                    className="bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                  >
                    <option value="POSTED">Posted</option>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>Reopen as {o.label}</option>)}
                  </select>
                  <span className="text-[11px] text-slate-500">Reopening lets it be posted again.</span>
                </div>
              ) : (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ContentStatus)}
                  className="w-full sm:w-64 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              <p className="text-[10px] text-slate-400 mt-1">To mark as Posted, use “Mark as Posted” so the link and time are recorded.</p>
            </div>
          )}

          {/* Section 3: Publishing Information */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-900 inline-block" />
              3. Caption &amp; Publishing Assets
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Social Media Caption
                </label>
                <textarea
                  rows={3}
                  placeholder="Paste the final social media caption to be copied by the posting intern..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hashtags
                </label>
                <input
                  type="text"
                  placeholder="#founder #reels #ai #startups #productivity"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Posting Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Post as Instagram Reel. Use cover frame with bold title. Add specified caption."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Optional Notes */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              4. Optional Notes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brief / Reference (raw files, links)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Raw footage in Google Drive folder 'Sep 18'"
                  value={referenceNotes}
                  onChange={(e) => setReferenceNotes(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Manager Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Part of Q3 sponsor test"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          </div>

          {/* Footer Actions (always visible) */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
              id="btn-submit-create-content"
            >
              {isEdit ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>
                {isSubmitting ? (isEdit ? 'Saving…' : 'Creating Content…') : isEdit ? 'Save Changes' : 'Create Content'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
