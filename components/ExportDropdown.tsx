import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Printer, FileDown, Mail } from 'lucide-react';

interface ExportDropdownProps {
    title: string;
    csvData: (string | number)[][];
    csvHeaders: string[];
    emailBodyContent: string;
    onPrint: () => void;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ title, csvData, csvHeaders, emailBodyContent, onPrint }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const generateCsvContent = (): string => {
        const headerRow = csvHeaders.join(',');
        const dataRows = csvData.map(row => 
            row.map(cell => {
                const stringCell = String(cell);
                // Escape commas and quotes
                if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
                    return `"${stringCell.replace(/"/g, '""')}"`;
                }
                return stringCell;
            }).join(',')
        );
        return [headerRow, ...dataRows].join('\n');
    };

    const handleDownloadCsv = () => {
        const csvContent = generateCsvContent();
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for BOM to support Arabic in Excel
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsOpen(false);
    };

    const handleEmail = () => {
        const subject = encodeURIComponent(`تقرير: ${title}`);
        const body = encodeURIComponent(emailBodyContent);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        setIsOpen(false);
    };

    const handlePrintClick = () => {
        onPrint();
        setIsOpen(false);
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(o => !o)} 
                className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-semibold"
            >
                <span>تصدير</span>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-primary rounded-xl shadow-neumo z-20 p-2">
                    <ul className="space-y-1 text-right">
                        <li>
                            <button onClick={handlePrintClick} className="w-full text-right flex items-center gap-3 p-2 rounded-lg hover:bg-primary-dark/20">
                                <Printer size={16}/><span>طباعة / حفظ كـ PDF</span>
                            </button>
                        </li>
                        <li>
                            <button onClick={handleDownloadCsv} className="w-full text-right flex items-center gap-3 p-2 rounded-lg hover:bg-primary-dark/20">
                                <FileDown size={16}/><span>تصدير كـ CSV (Excel)</span>
                            </button>
                        </li>
                        <li>
                            <button onClick={handleEmail} className="w-full text-right flex items-center gap-3 p-2 rounded-lg hover:bg-primary-dark/20">
                                <Mail size={16}/><span>إرسال عبر البريد الإلكتروني</span>
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ExportDropdown;
