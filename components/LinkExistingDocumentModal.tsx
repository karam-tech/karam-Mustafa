import React, { useState, useMemo } from 'react';
import { Document } from '../types';
import { X, Search, Link as LinkIcon, FileText } from 'lucide-react';

interface LinkExistingDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    allDocuments: Document[];
    currentLinkedToId: string;
    onLinkDocuments: (documentsToLink: Document[]) => void;
}

const LinkExistingDocumentModal: React.FC<LinkExistingDocumentModalProps> = ({ isOpen, onClose, allDocuments, currentLinkedToId, onLinkDocuments }) => {
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const availableDocuments = useMemo(() => {
        // 1. Get a "content hash" of documents already linked to the current entity to avoid duplicates.
        const alreadyLinkedContentHashes = new Set(
            allDocuments
                .filter(d => d.linkedToId === currentLinkedToId)
                .map(d => d.data) // 'data' is the base64 string, works as a content hash.
        );
        
        // 2. Create a list of unique documents from the entire system, based on content.
        const uniqueDocumentsByContent = new Map<string, Document>();
        allDocuments.forEach(doc => {
            if (!uniqueDocumentsByContent.has(doc.data)) {
                uniqueDocumentsByContent.set(doc.data, doc);
            }
        });
        
        // 3. Filter this unique list.
        return Array.from(uniqueDocumentsByContent.values()).filter(doc => {
            const nameMatch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
            const notAlreadyLinked = !alreadyLinkedContentHashes.has(doc.data);
            return nameMatch && notAlreadyLinked;
        });
    }, [allDocuments, currentLinkedToId, searchTerm]);

    const handleToggleSelection = (docId: string) => {
        setSelectedDocIds(prev =>
            prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
        );
    };

    const handleLink = () => {
        // Find the original document objects for the selected IDs to pass back for copying.
        const documentsToLink = allDocuments.filter(doc => selectedDocIds.includes(doc.id));
        onLinkDocuments(documentsToLink);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">ربط مستند موجود</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:shadow-neumo-sm"><X size={24} /></button>
                </div>
                
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="بحث باسم المستند..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-8 bg-primary rounded-lg shadow-neumo-inset-sm"
                    />
                    <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary"/>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {availableDocuments.length > 0 ? (
                        availableDocuments.map(doc => (
                            <label key={doc.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-primary-light cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selectedDocIds.includes(doc.id)}
                                    onChange={() => handleToggleSelection(doc.id)}
                                    className="w-4 h-4 accent-accent"
                                />
                                <FileText size={18} className="text-accent" />
                                <span>{doc.name}</span>
                                <span className="text-xs text-text-secondary ml-auto">({new Date(doc.uploadDate).toLocaleDateString('ar-EG')})</span>
                            </label>
                        ))
                    ) : (
                        <p className="text-center text-text-secondary p-8">لا توجد مستندات متاحة للربط.</p>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold">إلغاء</button>
                    <button 
                        onClick={handleLink}
                        disabled={selectedDocIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold disabled:bg-gray-400"
                    >
                        <LinkIcon size={18} />
                        ربط ({selectedDocIds.length}) مستند
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LinkExistingDocumentModal;
