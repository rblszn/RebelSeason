"use client";

import Link from "next/link";
import { X } from "lucide-react";

export default function OrderFailedClient({ order }: { order: any }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-pink-50/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-red-50 p-8 sm:p-12 text-center">
          
          <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white">
              <X className="w-8 h-8" strokeWidth={3} />
            </div>
          </div>

          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-3">
            Payment Failed
          </h1>
          
          <p className="text-gray-600 text-lg mb-6">
            Don't worry, your money is safe.
          </p>

          {order && (
            <div className="mb-6 py-3 px-4 bg-gray-50 rounded-lg inline-block">
              <span className="text-sm text-gray-500">Order ID: </span>
              <span className="font-semibold text-gray-900">{order.id}</span>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-10 text-left">
            <p className="text-sm text-amber-800 flex gap-3">
              <span className="text-lg leading-none">💡</span>
              If money was debited from your account, it will be automatically refunded within 5-7 business days.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link 
              href="/checkout" 
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
            >
              Retry Payment
            </Link>
            
            <Link 
              href="/cart" 
              className="w-full flex justify-center py-3.5 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
            >
              Return to Cart
            </Link>

            <Link 
              href="/" 
              className="w-full flex justify-center py-3.5 px-4 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mt-2"
            >
              Go to Home
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}
