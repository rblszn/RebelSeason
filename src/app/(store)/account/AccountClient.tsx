"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { OrderWithRelations } from "@/lib/dal/orders";
import { Address } from "@prisma/client";

interface AccountClientProps {
  session: { name: string; email: string; phone: string };
  orders: OrderWithRelations[];
}

export function AccountClient({ session, orders }: AccountClientProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "details" | "addresses">("orders");

  // Profile details state
  const [profileName, setProfileName] = useState(session.name);
  const [profilePhone, setProfilePhone] = useState(session.phone || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  
  // Address form state
  const [addrForm, setAddrForm] = useState({
    name: "", phone: "", street: "", city: "", state: "", pincode: "", isDefault: false
  });

  useEffect(() => {
    if (activeTab === "addresses" && addresses.length === 0) {
      fetchAddresses();
    }
  }, [activeTab]);

  const fetchAddresses = async () => {
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/account/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddressesLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, phone: profilePhone })
      });
      if (res.ok) {
        setProfileMessage({ type: "success", text: "Profile updated successfully." });
      } else {
        setProfileMessage({ type: "error", text: "Failed to update profile." });
      }
    } catch (e) {
      setProfileMessage({ type: "error", text: "An error occurred." });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingAddress;
      const url = isEdit ? `/api/account/addresses/${editingAddress.id}` : "/api/account/addresses";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addrForm)
      });

      if (res.ok) {
        await fetchAddresses();
        closeAddressModal();
      } else {
        alert("Failed to save address.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAddresses();
      } else {
        alert("Failed to delete address.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting.");
    }
  };

  const openAddressModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setAddrForm({
        name: address.name,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        isDefault: address.isDefault
      });
    } else {
      setEditingAddress(null);
      setAddrForm({
        name: "", phone: "", street: "", city: "", state: "", pincode: "", isDefault: false
      });
    }
    setIsAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    setIsAddressModalOpen(false);
    setEditingAddress(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
      {/* Sidebar */}
      <div className="md:col-span-1 space-y-2">
        <button 
          onClick={() => setActiveTab("orders")}
          className={`block w-full text-left px-4 py-3 text-[13px] transition-colors ${activeTab === "orders" ? "bg-secondary font-medium border-l-2 border-foreground" : "hover:bg-secondary/50 text-muted-foreground"}`}
        >
          Order History
        </button>
        <button 
          onClick={() => setActiveTab("details")}
          className={`block w-full text-left px-4 py-3 text-[13px] transition-colors ${activeTab === "details" ? "bg-secondary font-medium border-l-2 border-foreground" : "hover:bg-secondary/50 text-muted-foreground"}`}
        >
          Account Details
        </button>
        <button 
          onClick={() => setActiveTab("addresses")}
          className={`block w-full text-left px-4 py-3 text-[13px] transition-colors ${activeTab === "addresses" ? "bg-secondary font-medium border-l-2 border-foreground" : "hover:bg-secondary/50 text-muted-foreground"}`}
        >
          Saved Addresses
        </button>
        <Link href="/api/auth/logout" className="block w-full text-left px-4 py-3 hover:bg-secondary/50 text-[13px] text-red-600/80 mt-4">
          Log Out
        </Link>
      </div>

      {/* Content */}
      <div className="md:col-span-3">
        {activeTab === "orders" && (
          <div>
            <h2 className="text-lg font-medium mb-6">Order History</h2>
            {orders.length === 0 ? (
              <div className="border border-border rounded-md p-8 text-center bg-secondary/20">
                <p className="text-muted-foreground text-[14px] mb-4">You haven't placed any orders yet.</p>
                <Button variant="outline" className="rounded-full text-[12px]" asChild>
                  <Link href="/products">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="border border-border rounded-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-medium">Order #{order.orderNumber}</p>
                        <p className="text-[13px] text-muted-foreground">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{order.total.toLocaleString('en-IN')}</p>
                        <span className="inline-block px-2 py-1 mt-1 text-[11px] font-medium uppercase tracking-wider bg-secondary rounded-sm">
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-border pt-4">
                      <p className="text-[13px] text-muted-foreground mb-2">{order.items.length} items</p>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex-shrink-0 w-16 h-20 bg-secondary rounded-sm overflow-hidden relative border border-border">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">No Img</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "details" && (
          <div>
            <h2 className="text-lg font-medium mb-6">Account Details</h2>
            <div className="border border-border rounded-md p-6 bg-white shadow-sm max-w-xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full text-[15px] p-2 border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={session.email}
                    disabled
                    className="w-full text-[15px] p-2 border border-border rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full text-[15px] p-2 border border-border rounded-md"
                    placeholder="Enter phone number"
                  />
                </div>
                
                {profileMessage && (
                  <p className={`text-[13px] ${profileMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                    {profileMessage.text}
                  </p>
                )}

                <div className="pt-4 mt-4 border-t border-border">
                  <Button 
                    onClick={handleProfileSave} 
                    disabled={profileLoading}
                    className="text-[13px]"
                  >
                    {profileLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "addresses" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Saved Addresses</h2>
              <Button onClick={() => openAddressModal()} className="text-[12px] h-8">
                Add New Address
              </Button>
            </div>

            {addressesLoading ? (
              <p className="text-sm text-muted-foreground">Loading addresses...</p>
            ) : addresses.length === 0 ? (
              <div className="border border-border border-dashed rounded-md p-8 text-center bg-secondary/10 max-w-xl">
                <p className="text-muted-foreground text-[14px] mb-4">No addresses saved yet.</p>
                <Button onClick={() => openAddressModal()} className="rounded-full text-[12px] bg-black text-white hover:bg-gray-800">
                  Add New Address
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="border border-border rounded-md p-4 relative">
                    {addr.isDefault && (
                      <span className="absolute top-4 right-4 text-[10px] bg-black text-white px-2 py-1 rounded-sm uppercase tracking-wider">
                        Default
                      </span>
                    )}
                    <h3 className="font-medium text-[15px]">{addr.name}</h3>
                    <p className="text-[13px] text-muted-foreground mt-1">{addr.phone}</p>
                    <p className="text-[13px] mt-2 text-gray-700 leading-relaxed">
                      {addr.street}<br />
                      {addr.city}, {addr.state} {addr.pincode}
                    </p>
                    
                    <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                      <button 
                        onClick={() => openAddressModal(addr)}
                        className="text-[12px] font-medium hover:underline"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-[12px] text-red-600 font-medium hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-medium mb-4">{editingAddress ? "Edit Address" : "Add New Address"}</h3>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">Name</label>
                  <input required type="text" value={addrForm.name} onChange={e => setAddrForm({...addrForm, name: e.target.value})} className="w-full text-[14px] p-2 border border-border rounded-md" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">Phone</label>
                  <input required type="tel" value={addrForm.phone} onChange={e => setAddrForm({...addrForm, phone: e.target.value})} className="w-full text-[14px] p-2 border border-border rounded-md" />
                </div>
              </div>
              
              <div>
                <label className="block text-[12px] font-medium text-gray-500 mb-1">Street Address</label>
                <input required type="text" value={addrForm.street} onChange={e => setAddrForm({...addrForm, street: e.target.value})} className="w-full text-[14px] p-2 border border-border rounded-md" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">City</label>
                  <input required type="text" value={addrForm.city} onChange={e => setAddrForm({...addrForm, city: e.target.value})} className="w-full text-[14px] p-2 border border-border rounded-md" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">State</label>
                  <input required type="text" value={addrForm.state} onChange={e => setAddrForm({...addrForm, state: e.target.value})} className="w-full text-[14px] p-2 border border-border rounded-md" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-500 mb-1">Pincode</label>
                <input required type="text" value={addrForm.pincode} onChange={e => setAddrForm({...addrForm, pincode: e.target.value})} className="w-full text-[14px] p-2 border border-border rounded-md" />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isDefault" 
                  checked={addrForm.isDefault} 
                  onChange={e => setAddrForm({...addrForm, isDefault: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isDefault" className="text-[13px] font-medium">Set as default address</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <Button type="button" variant="outline" onClick={closeAddressModal}>Cancel</Button>
                <Button type="submit">Save Address</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
