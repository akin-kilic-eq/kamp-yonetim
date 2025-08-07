'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '../services/api';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const response = await login(formData.email, formData.password);
      
  
      
      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.user.email !== 'kurucu_admin@antteq.com' && !response.user.isApproved) {
        setError('Hesabınız henüz onaylanmadı. Lütfen yönetici onayını bekleyin.');
        return;
      }

      // Kullanıcı bilgilerini session'a kaydet
      const userData = {
        email: response.user.email.toLowerCase(),
        role: response.user.role,
        site: response.user.site,
        isApproved: response.user.isApproved,
        siteAccessApproved: response.user.siteAccessApproved,
        sitePermissions: response.user.sitePermissions,
        camps: response.user.camps
      };
      
      console.log('Session\'a kaydedilen kullanıcı verileri:', userData);
      sessionStorage.setItem('currentUser', JSON.stringify(userData));

      // Rol bazlı yönlendirme
      switch (response.user.role) {
        case 'kurucu_admin':
          router.push('/admin-dashboard');
          break;
        case 'merkez_admin':
          router.push('/merkez-admin-dashboard');
          break;
        case 'personel_admin':
        case 'personel_user':
          router.push('/personnel');
          break;
        case 'santiye_admin':
        case 'user':
        default:
          router.push('/camps');
          break;
      }
    } catch (error) {
      setError('Giriş yapılırken bir hata oluştu');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/arka-plan-guncel-2.jpg')" }}
    >
      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Giriş Yap
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email adresi
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email adresi"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Şifre"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Giriş Yap
            </button>
          </div>

          <div className="text-sm text-center">
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Hesabınız yok mu? Kayıt olun
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 