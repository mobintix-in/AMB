'use client';

import { useState } from 'react';
import { X, Check, QrCode, Smartphone, ExternalLink, ShieldCheck } from 'lucide-react';
import { sounds } from '@/lib/audio';

interface UpiQrModalProps {
  amount: number;
  invoiceNumber: string;
  customerName: string;
  onPaymentConfirmed: (refId: string) => void;
  onClose: () => void;
}

export function UpiQrModal({
  amount,
  invoiceNumber,
  customerName,
  onPaymentConfirmed,
  onClose,
}: UpiQrModalProps) {
  const [refId, setRefId] = useState('UPI-88419201');
  const [isVerifying, setIsVerifying] = useState(false);

  // Dynamic NPCI UPI QR string:
  const upiString = `upi://pay?pa=amb.hub@icici&pn=AMBMedERP&am=${amount.toFixed(2)}&cu=INR&tn=Invoice_${invoiceNumber}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiString)}&margin=10`;

  const handleSimulatePayment = () => {
    setIsVerifying(true);
    setTimeout(() => {
      sounds.playSave();
      onPaymentConfirmed(refId);
      setIsVerifying(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Dynamic UPI Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Invoice: #{invoiceNumber} • {customerName}</div>
            <div className="text-3xl font-extrabold text-emerald-700 font-mono">
              ₹{amount.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              NPCI Dynamic Intent Auto-Reconciled
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="UPI QR Code"
              className="w-56 h-56 object-contain"
            />
          </div>

          <div className="text-xs text-slate-500 max-w-xs">
            Scan using any UPI App (Google Pay, PhonePe, Paytm, CRED). The amount is locked to exact invoice total.
          </div>

          {/* Mock Bank Webhook Listener Status */}
          <div className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 text-left text-xs space-y-1 font-mono text-slate-700 shadow-2xs">
            <div className="flex justify-between text-slate-500">
              <span>UPI VPA:</span>
              <span className="text-sky-700 font-semibold">amb.hub@icici</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Txn Reference:</span>
              <span className="text-slate-800">{refId}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Listening for bank webhook confirmation...
            </div>
          </div>

          {/* Simulate Action Button */}
          <button
            onClick={handleSimulatePayment}
            disabled={isVerifying}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Verifying UPI Receipt...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simulate Customer Scanned & Paid</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
