import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  MoveUp,
  MoveDown,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Tag,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cake,
  FolderPlus,
  ArrowRight,
  Sliders,
  Images,
  RefreshCw,
  X,
  Wand2,
  Palette,
  Clock,
} from 'lucide-react';
import { templateApi } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import TemplateBackgroundStudioModal from '@/components/bakery/TemplateBackgroundStudioModal';

const formatMoney = (minor = 0) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);

export default function BakeryTemplates() {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Section modal
  const [sectionModal, setSectionModal] = useState({ open: false, mode: 'create', section: null, name: '' });
  const [deleteSectionTarget, setDeleteSectionTarget] = useState(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState(null);
  const [viewTemplateModal, setViewTemplateModal] = useState(null);
  const [activePreviewAngle, setActivePreviewAngle] = useState(0);

  // Edit template modal (quick description/section edit)
  const [editTemplateModal, setEditTemplateModal] = useState({
    open: false,
    template: null,
    name: '',
    description: '',
    longDescription: '',
    sectionId: '',
    priceMinor: 0,
  });

  const [studioTargetTemplate, setStudioTargetTemplate] = useState(null);
  const [savingAction, setSavingAction] = useState(false);

  const handleSaveStudioViews = async (updatedViews) => {
    if (!studioTargetTemplate) return;
    try {
      setSavingAction(true);
      // Upload any new base64 views to Cloudinary and strip temporary studio fields
      const cleanedViews = await Promise.all(
        (updatedViews || []).map(async (view) => {
          let currentUrl = view.url;
          let currentPublicId = view.cloudinaryPublicId || '';
          if (currentUrl && currentUrl.startsWith('data:')) {
            const uploadResult = await templateApi.uploadTemplateImage(currentUrl);
            currentUrl = uploadResult.secureUrl;
            currentPublicId = uploadResult.publicId;
          }
          return {
            label: view.label || '',
            angle: view.angle || '',
            url: currentUrl,
            cloudinaryPublicId: currentPublicId,
          };
        })
      );

      const updatedThumbnail = cleanedViews[0]?.url || studioTargetTemplate.thumbnail;
      await templateApi.updateTemplate(studioTargetTemplate._id, {
        views: cleanedViews,
        thumbnail: updatedThumbnail,
      });
      showNotification('Showcase pictures and background updated successfully!');
      setViewTemplateModal(null);
      setStudioTargetTemplate(null);
      await fetchTemplatesData();
    } catch (err) {
      console.error('Failed to update template pictures:', err);
      setError('Failed to save updated showcase pictures.');
    } finally {
      setSavingAction(false);
    }
  };

  useEffect(() => {
    fetchTemplatesData();
    const handleDraftsChanged = () => fetchTemplatesData();
    window.addEventListener('bakery-drafts-changed', handleDraftsChanged);
    return () => window.removeEventListener('bakery-drafts-changed', handleDraftsChanged);
  }, []);

  const fetchTemplatesData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await templateApi.getBakeryTemplates();
      setSections(data.sections || []);
    } catch (err) {
      console.error('Failed to load bakery templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  // Section CRUD
  const handleSaveSection = async (e) => {
    e.preventDefault();
    if (!sectionModal.name.trim()) return;
    setSavingAction(true);
    try {
      if (sectionModal.mode === 'create') {
        await templateApi.createSection(sectionModal.name.trim());
        showNotification('New section added successfully!');
      } else {
        await templateApi.updateSection(sectionModal.section._id, { name: sectionModal.name.trim() });
        showNotification('Section renamed successfully!');
      }
      setSectionModal({ open: false, mode: 'create', section: null, name: '' });
      await fetchTemplatesData();
    } catch (err) {
      console.error('Failed to save section:', err);
      setError('Failed to save section.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteSectionTarget) return;
    setSavingAction(true);
    try {
      await templateApi.deleteSection(deleteSectionTarget._id);
      showNotification(`Section "${deleteSectionTarget.name}" deleted.`);
      setDeleteSectionTarget(null);
      await fetchTemplatesData();
    } catch (err) {
      console.error('Failed to delete section:', err);
      setError('Failed to delete section.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleMoveSection = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setSections(reordered);
    try {
      await templateApi.reorderSections(reordered.map((s) => s._id));
      showNotification('Section order updated.');
    } catch (err) {
      console.error('Failed to reorder sections:', err);
      await fetchTemplatesData();
    }
  };

  // Template CRUD
  const handleDeleteTemplate = async () => {
    if (!deleteTemplateTarget) return;
    setSavingAction(true);
    try {
      await templateApi.deleteTemplate(deleteTemplateTarget._id);
      showNotification(`Template "${deleteTemplateTarget.name}" removed.`);
      setDeleteTemplateTarget(null);
      await fetchTemplatesData();
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError('Failed to delete template.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleMoveTemplate = async (sectionId, templateIndex, direction) => {
    const section = sections.find((s) => s._id === sectionId);
    if (!section) return;
    const templates = [...(section.templates || [])];
    const targetIndex = templateIndex + direction;
    if (targetIndex < 0 || targetIndex >= templates.length) return;

    const [moved] = templates.splice(templateIndex, 1);
    templates.splice(targetIndex, 0, moved);

    setSections((prev) =>
      prev.map((s) => (s._id === sectionId ? { ...s, templates } : s))
    );

    try {
      await templateApi.reorderTemplates(sectionId, templates.map((t) => t._id));
      showNotification('Template display order updated.');
    } catch (err) {
      console.error('Failed to reorder templates:', err);
      await fetchTemplatesData();
    }
  };

  const handleSaveEditTemplate = async (e) => {
    e.preventDefault();
    if (!editTemplateModal.name.trim()) return;
    setSavingAction(true);
    try {
      await templateApi.updateTemplate(editTemplateModal.template._id, {
        name: editTemplateModal.name.trim(),
        description: editTemplateModal.description.trim(),
        longDescription: editTemplateModal.longDescription.trim(),
        sectionId: editTemplateModal.sectionId,
        priceMinor: Number(editTemplateModal.priceMinor) || 0,
      });
      showNotification('Template updated successfully!');
      setEditTemplateModal({ open: false, template: null, name: '', description: '', longDescription: '', sectionId: '', priceMinor: 0 });
      await fetchTemplatesData();
    } catch (err) {
      console.error('Failed to update template:', err);
      setError('Failed to update template.');
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4 pt-2">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-pink-500/10 via-rose-50 to-orange-50/20 p-6 rounded-2xl border border-pink-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-pink-600 font-bold text-xs uppercase tracking-wider mb-1">
            <LayoutTemplate className="w-4 h-4" /> Bakery Template Studio
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Template & Section Maker</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Design custom cake templates in the 3D designer with 8 automated camera screenshot angles, manage client catalog sections, and organize display order.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSectionModal({ open: true, mode: 'create', section: null, name: '' })}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-pink-200 bg-white hover:bg-pink-50/50 text-gray-700 text-xs font-bold transition-all shadow-xs"
          >
            <FolderPlus className="w-4 h-4 text-pink-500" /> Add Section
          </button>
          <Link
            to="/bakery/designer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-all shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/30 active:scale-98"
          >
            <Sparkles className="w-4 h-4" /> Design New Template <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {feedback}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </div>
          <button type="button" onClick={fetchTemplatesData} className="underline text-rose-700 hover:text-rose-900">Retry</button>
        </div>
      )}

      {/* Main Sections & Templates Content */}
      {loading ? (
        <div role="status" aria-label="Loading templates and sections" className="space-y-6">
          {[0, 1, 2].map((row) => (
            <section key={row} className="rounded-2xl border border-pink-100 bg-white p-5">
              <Skeleton className="mb-5 h-6 w-40" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="space-y-3 rounded-xl border border-pink-100 p-2">
                    <Skeleton className="aspect-square w-full rounded-lg" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center text-center gap-4 bg-white rounded-2xl border border-dashed border-pink-200">
          <div className="w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center text-pink-500">
            <LayoutTemplate className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">No template sections yet</h3>
            <p className="text-sm text-gray-500 max-w-md mt-1">
              Create your first template section to organize and showcase preset designs for your customers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSectionModal({ open: true, mode: 'create', section: null, name: '' })}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-pink-500 text-white text-xs font-bold hover:bg-pink-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Section
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section, sIdx) => {
            const templates = section.templates || [];
            return (
              <div
                key={section._id}
                className="bg-white rounded-2xl border border-pink-100 shadow-xs overflow-hidden transition-all hover:border-pink-200"
              >
                {/* Section Header */}
                <div className="px-6 py-4 bg-gray-50/70 border-b border-pink-100/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-bold">
                      {sIdx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-gray-900 text-base font-heading">{section.name}</h2>
                        <span className="text-[11px] font-semibold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                          {templates.length} {templates.length === 1 ? 'template' : 'templates'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Client carousel section displayed on <Link to="/templates" target="_blank" className="text-pink-600 hover:underline">/templates</Link>
                      </p>
                    </div>
                  </div>

                  {/* Section Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={sIdx === 0}
                      onClick={() => handleMoveSection(sIdx, -1)}
                      title="Move section up"
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={sIdx === sections.length - 1}
                      onClick={() => handleMoveSection(sIdx, 1)}
                      title="Move section down"
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSectionModal({ open: true, mode: 'edit', section, name: section.name })}
                      title="Rename section"
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors ml-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteSectionTarget(section)}
                      title="Delete section"
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      to={`/bakery/designer?sectionId=${section._id}`}
                      className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-bold hover:bg-pink-600 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Cake Here
                    </Link>
                  </div>
                </div>

                {/* Templates Grid in this Section */}
                <div className="p-6">
                  {templates.length === 0 ? (
                    <div className="py-8 px-4 text-center rounded-xl bg-pink-50/30 border border-dashed border-pink-200 flex flex-col items-center justify-center gap-2">
                      <Cake className="w-7 h-7 text-pink-300" />
                      <p className="text-xs text-gray-500 font-medium">No templates inside &ldquo;{section.name}&rdquo; yet.</p>
                      <Link
                        to={`/bakery/designer?sectionId=${section._id}`}
                        className="text-xs font-bold text-pink-600 hover:text-pink-700 underline flex items-center gap-1 mt-1"
                      >
                        Create a template for this section →
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {templates.map((tpl, tIdx) => {
                        const viewsCount = tpl.views?.length || 0;
                        return (
                          <div
                            key={tpl._id}
                            className="group relative bg-white border border-gray-200 hover:border-pink-300 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                          >
                            {/* Thumbnail & 8-angle indicator */}
                            <div className="aspect-video relative bg-pink-50/50 overflow-hidden border-b border-gray-100">
                              {tpl.thumbnail ? (
                                <img
                                  src={tpl.thumbnail}
                                  alt={tpl.name}
                                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-pink-300">
                                  <Cake className="w-8 h-8" />
                                </div>
                              )}

                              {viewsCount > 0 && (
                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                                  <Images className="w-3 h-3" /> {viewsCount} Angles
                                </span>
                              )}

                              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  disabled={tIdx === 0}
                                  onClick={() => handleMoveTemplate(section._id, tIdx, -1)}
                                  title="Move earlier"
                                  className="p-1 rounded-md bg-white/90 text-gray-700 hover:bg-white disabled:opacity-30 transition-colors shadow-xs"
                                >
                                  <MoveUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={tIdx === templates.length - 1}
                                  onClick={() => handleMoveTemplate(section._id, tIdx, 1)}
                                  title="Move later"
                                  className="p-1 rounded-md bg-white/90 text-gray-700 hover:bg-white disabled:opacity-30 transition-colors shadow-xs"
                                >
                                  <MoveDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Info */}
                            <div className="p-3.5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-1 mb-1">
                                  <h3 className="font-bold text-gray-900 text-sm truncate font-heading" title={tpl.name}>
                                    {tpl.name}
                                  </h3>
                                  <span className="text-xs font-bold text-pink-600 tabular-nums shrink-0">
                                    {formatMoney(tpl.priceMinor)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                  {tpl.description || tpl.longDescription || 'No description provided.'}
                                </p>

                                {tpl.specs?.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                                    {tpl.specs.slice(0, 3).map((sp, idx) => (
                                      <span key={idx} className="text-[9px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                        {sp.value}
                                      </span>
                                    ))}
                                    {tpl.specs.length > 3 && (
                                      <span className="text-[9px] text-gray-400 font-semibold px-1 py-0.5">
                                        +{tpl.specs.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Card Action footer */}
                              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewTemplateModal(tpl);
                                    setActivePreviewAngle(0);
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-pink-600 transition-colors py-1 px-1.5 rounded"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Preview
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setStudioTargetTemplate(tpl)}
                                    title="Background Maker & Photo Studio"
                                    className="p-1 rounded-md text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                                  >
                                    <Wand2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditTemplateModal({
                                        open: true,
                                        template: tpl,
                                        name: tpl.name,
                                        description: tpl.description || '',
                                        longDescription: tpl.longDescription || '',
                                        sectionId: tpl.sectionId || section._id,
                                        priceMinor: tpl.priceMinor || 0,
                                      })
                                    }
                                    title="Edit details"
                                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <Link
                                    to={`/bakery/designer?templateId=${tpl._id}`}
                                    title="Open and redesign in 3D studio"
                                    className="p-1 rounded-md text-pink-500 hover:text-pink-700 hover:bg-pink-50 transition-colors"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTemplateTarget(tpl)}
                                    title="Delete template"
                                    className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION CREATE / EDIT MODAL */}
      {sectionModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSection}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-pink-100 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-heading font-bold text-gray-900 text-lg">
                {sectionModal.mode === 'create' ? 'Create Template Section' : 'Rename Section'}
              </h3>
              <button
                type="button"
                onClick={() => setSectionModal({ open: false, mode: 'create', section: null, name: '' })}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Section Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={sectionModal.name}
                  onChange={(e) => setSectionModal((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Wedding Specials, Birthday Classics, Seasonal Hits"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm font-medium"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  This title appears above the horizontal cake carousel on the client Templates page.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSectionModal({ open: false, mode: 'create', section: null, name: '' })}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAction || !sectionModal.name.trim()}
                className="px-5 py-2 text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {sectionModal.mode === 'create' ? 'Create Section' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TEMPLATE QUICK EDIT MODAL */}
      {editTemplateModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditTemplate}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-pink-100 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-heading font-bold text-gray-900 text-lg">Edit Template Details</h3>
              <button
                type="button"
                onClick={() => setEditTemplateModal({ open: false, template: null, name: '', description: '', longDescription: '', sectionId: '', priceMinor: 0 })}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={editTemplateModal.name}
                  onChange={(e) => setEditTemplateModal((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">Assigned Section</label>
                  <select
                    value={editTemplateModal.sectionId}
                    onChange={(e) => setEditTemplateModal((p) => ({ ...p, sectionId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-300 bg-white"
                  >
                    {sections.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">Display Price (PHP)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editTemplateModal.priceMinor / 100}
                    onChange={(e) => setEditTemplateModal((p) => ({ ...p, priceMinor: Math.round(Number(e.target.value) * 100) }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-300 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">Short Tagline Description</label>
                <input
                  type="text"
                  value={editTemplateModal.description}
                  onChange={(e) => setEditTemplateModal((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Sophisticated & beautiful for celebrations"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">Full Detailed Story Description</label>
                <textarea
                  rows={3}
                  value={editTemplateModal.longDescription}
                  onChange={(e) => setEditTemplateModal((p) => ({ ...p, longDescription: e.target.value }))}
                  placeholder="Detailed description shown in client preview popup..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-300 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 mt-6 pt-3 border-t border-gray-100">
              <Link
                to={`/bakery/designer?templateId=${editTemplateModal.template?._id}`}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Redesign 3D Cake
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditTemplateModal({ open: false, template: null, name: '', description: '', longDescription: '', sectionId: '', priceMinor: 0 })}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="px-5 py-2 text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {savingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 8-ANGLE PREVIEW MODAL */}
      {viewTemplateModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
          onClick={() => setViewTemplateModal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-pink-100 flex flex-col md:flex-row animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: 8 angles viewer */}
            <div className="md:w-3/5 p-6 bg-pink-50/30 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-pink-100">
              <div className="w-full aspect-square rounded-2xl overflow-hidden bg-white border border-pink-100 shadow-sm relative">
                {viewTemplateModal.views?.[activePreviewAngle]?.url ? (
                  <img
                    src={viewTemplateModal.views[activePreviewAngle].url}
                    alt={viewTemplateModal.views[activePreviewAngle].label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={viewTemplateModal.thumbnail}
                    alt={viewTemplateModal.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-bold backdrop-blur-xs">
                  {viewTemplateModal.views?.[activePreviewAngle]?.label || 'Front View'}
                </span>
              </div>

              {/* 8 Thumbnails strip */}
              {viewTemplateModal.views?.length > 0 && (
                <div className="flex gap-2 mt-4 overflow-x-auto w-full py-1 [scrollbar-width:none]">
                  {viewTemplateModal.views.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActivePreviewAngle(i)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        activePreviewAngle === i
                          ? 'border-pink-500 ring-2 ring-pink-200 scale-105'
                          : 'border-pink-100 hover:border-pink-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={v.url} alt={v.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Details & specs */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-pink-600">
                      Cake Template
                    </span>
                    <h2 className="font-heading text-xl font-bold text-gray-900 mt-0.5">
                      {viewTemplateModal.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewTemplateModal(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-4">
                  <span className="text-2xl font-bold text-pink-600 font-heading">
                    {formatMoney(viewTemplateModal.priceMinor)}
                  </span>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    {viewTemplateModal.longDescription || viewTemplateModal.description || 'No description added.'}
                  </p>
                </div>

                {/* Auto-extracted Specifications */}
                {viewTemplateModal.specs?.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-pink-500" /> Automated Specs
                    </p>
                    <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                      {viewTemplateModal.specs.map((sp, idx) => (
                        <div key={idx} className="flex justify-between items-start gap-2">
                          <span className="font-medium text-gray-500">{sp.label}</span>
                          <span className="font-semibold text-gray-800 text-right">{sp.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-gray-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tpl = viewTemplateModal;
                    setViewTemplateModal(null);
                    setStudioTargetTemplate(tpl);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold text-center transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Wand2 className="w-4 h-4" /> Background Maker & Photo Studio
                </button>
                <Link
                  to={`/bakery/designer?templateId=${viewTemplateModal._id}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold text-center transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Edit in 3D Studio
                </Link>
                <button
                  type="button"
                  onClick={() => setViewTemplateModal(null)}
                  className="w-full py-2 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold text-center transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SECTION DIALOG */}
      {deleteSectionTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-gray-900 mb-1">
              Delete section &ldquo;{deleteSectionTarget.name}&rdquo;?
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Deleting this section will also remove all templates inside it from the client Templates page.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteSectionTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction}
                onClick={handleDeleteSection}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
              >
                {savingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE TEMPLATE DIALOG */}
      {deleteTemplateTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-gray-900 mb-1">
              Remove template &ldquo;{deleteTemplateTarget.name}&rdquo;?
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              This template will be removed from your catalog and will no longer be visible to customers on the Templates page.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTemplateTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction}
                onClick={handleDeleteTemplate}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
              >
                {savingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BACKGROUND MAKER & PHOTO STUDIO MODAL */}
      {studioTargetTemplate && (
        <TemplateBackgroundStudioModal
          isOpen={Boolean(studioTargetTemplate)}
          onClose={() => setStudioTargetTemplate(null)}
          views={studioTargetTemplate.views || []}
          templateName={studioTargetTemplate.name || 'Cake Template'}
          onSave={handleSaveStudioViews}
        />
      )}
    </div>
  );
}
