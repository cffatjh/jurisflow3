import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Search, X } from './../Icons';

export interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: (string | ComboboxOption)[];
    placeholder?: string;
    required?: boolean;
    className?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder = 'Select...',
    required = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Normalize options
    const normalizedOptions: ComboboxOption[] = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = normalizedOptions.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    // Find label for current value
    const selectedLabel = normalizedOptions.find(opt => opt.value === value)?.label || value;

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && '*'}
                </label>
            )}

            <div
                className={`
                    w-full border rounded-lg bg-white relative text-left cursor-text
                    focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
                    ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300'}
                `}
                onClick={() => {
                    if (!isOpen) {
                        setIsOpen(true);
                        setTimeout(() => inputRef.current?.focus(), 0);
                    }
                }}
            >
                <div className="flex items-center min-h-[42px] px-3">
                    {/* Display Mode */}
                    {!isOpen && value ? (
                        <div className="flex-1 text-sm text-gray-900 truncate flex items-center justify-between">
                            <span>{selectedLabel}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange('');
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        // Edit/Search Mode
                        <div className="flex-1 flex items-center gap-2">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full text-sm outline-none text-gray-900 placeholder-gray-400 bg-transparent py-2"
                                placeholder={value ? selectedLabel : placeholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => setIsOpen(true)}
                            />
                        </div>
                    )}

                    {!isOpen && !value && (
                        <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
                    )}
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 overflow-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No results found "{search}"
                            {search && (
                                <button
                                    className="block mt-1 text-blue-600 hover:underline mx-auto font-medium"
                                    onClick={() => handleSelect(search)}
                                >
                                    Use "{search}"
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleSelect(opt.value)}
                                className={`
                                    w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                                    ${value === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}
                                `}
                            >
                                {opt.label}
                                {value === opt.value && <ChevronRight className="w-4 h-4 text-blue-600" />}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
