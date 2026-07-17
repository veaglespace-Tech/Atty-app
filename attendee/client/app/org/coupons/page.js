"use client";

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/services/api/baseApi";
import { useSelector } from "react-redux";

export default function MyCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    fetch(`${API_BASE_URL}/coupons/my-coupons`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCoupons(data.data);
        }
      })
      .catch((err) => console.error(err));
  }, [token]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Referral Coupons</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {coupons.length === 0 ? (
          <p>No coupons have been assigned to you yet.</p>
        ) : (
          coupons.map((c) => (
            <div key={c.id} className="bg-white p-6 shadow rounded-lg border">
              <h2 className="text-xl font-bold text-blue-600 mb-2">{c.code}</h2>
              <p className="text-gray-600">Discount: {c.discountValue} {c.discountType}</p>
              <p className="text-gray-600 mt-4 font-semibold">Total Times Used: {c.usesCount}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
