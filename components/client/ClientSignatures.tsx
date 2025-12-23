import React, { useState, useEffect, useRef } from 'react';
import { FileText, Check, X, Clock, AlertCircle, Edit3 } from '../Icons';
import { SignatureRequest } from '../../types';

interface ClientSignaturesProps {
    clientId: string;
}

const ClientSignatures: React.FC<ClientSignaturesProps> = ({ clientId }) => {
    const [signatureRequests, setSignatureRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [signingRequest, setSigningRequest] = useState<any | null>(null);
    const [signatureData, setSignatureData] = useState<string>('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        fetchSignatureRequests();
    }, []);

    const fetchSignatureRequests = async () => {
        try {
            const token = localStorage.getItem('clientToken');
            const res = await fetch('/api/client/signatures', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSignatureRequests(data);
            }
        } catch (error) {
            console.error('Error fetching signature requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        initCanvas();
    };

    const submitSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !signingRequest) return;

        const signatureImage = canvas.toDataURL('image/png');

        try {
            const token = localStorage.getItem('clientToken');
            const res = await fetch(`/api/client/sign/${signingRequest.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ signatureData: signatureImage }),
            });

            if (res.ok) {
                setSigningRequest(null);
                fetchSignatureRequests();
            }
        } catch (error) {
            console.error('Error submitting signature:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'signed':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1"><Check className="w-3 h-3" /> Signed</span>;
            case 'pending':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
            case 'declined':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1"><X className="w-3 h-3" /> Declined</span>;
            case 'expired':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Expired</span>;
            default:
                return null;
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">My E-Signature Requests</h2>
                    <p className="text-gray-600 mt-1">Sign your documents digitally</p>
                </div>

                {/* Signing Modal */}
                {signingRequest && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Sign Document</h3>
                                <button onClick={() => setSigningRequest(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-gray-600 mb-4">
                                Draw your signature in the area below. This signature will be considered legally valid.
                            </p>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg mb-4">
                                <canvas
                                    ref={canvasRef}
                                    width={450}
                                    height={150}
                                    className="w-full cursor-crosshair"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                />
                            </div>

                            <div className="flex justify-between">
                                <button
                                    onClick={clearSignature}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Clear
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSigningRequest(null)}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitSignature}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Sign
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Signature Requests List */}
                {signatureRequests.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Edit3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No signature requests</h3>
                        <p className="text-gray-500">When your attorney requests a document signature, it will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {signatureRequests.map((request) => (
                            <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-semibold text-gray-900">{request.document?.name || 'Belge'}</span>
                                                {getStatusBadge(request.status)}
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                Talep tarihi: {formatDate(request.createdAt)}
                                                {request.expiresAt && ` • Son tarih: ${formatDate(request.expiresAt)}`}
                                            </p>
                                        </div>
                                    </div>

                                    {request.status === 'pending' && (
                                        <button
                                            onClick={() => {
                                                setSigningRequest(request);
                                                setTimeout(initCanvas, 100);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            Sign
                                        </button>
                                    )}

                                    {request.status === 'signed' && request.signatureData && (
                                        <img
                                            src={request.signatureData}
                                            alt="Signature"
                                            className="h-12 border border-gray-200 rounded"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientSignatures;
