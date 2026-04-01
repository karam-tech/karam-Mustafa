import React, { useState, useRef } from 'react';
import { Document } from '../types';
import { Upload, FileText, Trash2, AlertTriangle, Link } from 'lucide-react';
import LinkExistingDocumentModal from './LinkExistingDocumentModal.tsx';

interface DocumentManagerProps {
  linkedToId: string;
  linkedToType: 'account' | 'operation';
  documents: Document[];
  allDocuments: Document[];
  addDocument: (file: File, linkedToId: string, linkedToType: 'account' | 'operation') => Promise<void>;
  deleteDocument: (id: string) => void;
  linkExistingDocuments: (documentsToLink: Document[], linkedToId: string, linkedToType: 'account' | 'operation') => void;
  canManage: boolean;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const DocumentManager: React.FC<DocumentManagerProps> = ({ linkedToId, linkedToType, documents, allDocuments, addDocument, deleteDocument, linkExistingDocuments, canManage }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        try {
            await addDocument(file, linkedToId, linkedToType);
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء رفع الملف.');
        } finally {
            setIsLoading(false);
            // Reset file input to allow uploading the same file again
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="bg-primary p-4 rounded-xl shadow-neumo-sm">
            <LinkExistingDocumentModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                allDocuments={allDocuments}
                currentLinkedToId={linkedToId}
                onLinkDocuments={(docs) => linkExistingDocuments(docs, linkedToId, linkedToType)}
            />
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h3 className="font-bold text-lg text-slate-700">المستندات المرفقة</h3>
                {canManage && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsLinkModalOpen(true)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-semibold text-sm disabled:bg-gray-400"
                        >
                            <Link size={16} />
                            <span>ربط مستند موجود</span>
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 py-1 bg-accent text-white rounded-md hover:bg-accent-dark font-semibold text-sm disabled:bg-gray-400"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <Upload size={16} />
                            )}
                            <span>{isLoading ? 'جاري الرفع...' : 'رفع مستند'}</span>
                        </button>
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isLoading}
                />
            </div>
            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md mb-3 text-sm flex items-center gap-2">
                    <AlertTriangle size={18}/> {error}
                </div>
            )}
            <div className="space-y-2">
                {documents.length > 0 ? (
                    documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-primary rounded-lg shadow-neumo-inset-sm group">
                            <div className="flex items-center gap-3">
                                <FileText size={20} className="text-accent flex-shrink-0" />
                                <div className="flex-grow">
                                    <a href={doc.data} download={doc.name} className="font-semibold text-slate-800 hover:underline truncate" title={doc.name}>
                                        {doc.name}
                                    </a>
                                    <p className="text-xs text-text-secondary">
                                        {formatFileSize(doc.size)} - {new Date(doc.uploadDate).toLocaleDateString('ar-EG')}
                                    </p>
                                </div>
                            </div>
                            {canManage && (
                                <button onClick={() => deleteDocument(doc.id)} className="p-1 text-red-500 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-center text-sm text-text-secondary py-4">لا توجد مستندات مرفقة.</p>
                )}
            </div>
        </div>
    );
};

export default DocumentManager;
