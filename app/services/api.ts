import { Room, Worker } from '@/app/[camp]/types';
import { cache } from '@/app/lib/cache';

// Auth API
export const register = async (email: string, password: string, site: string) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, site })
  });
  return response.json();
};

export const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};

// Camp API
export const getCamps = async (userEmail: string, role?: string) => {
  const url = role ? `/api/camps?userEmail=${userEmail}&role=${role}` : `/api/camps?userEmail=${userEmail}`;
  const response = await fetch(url);
  return response.json();
};

export const createCamp = async (campData: any) => {
  const response = await fetch('/api/camps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campData)
  });
  return response.json();
};

export const updateCamp = async (campData: any, userEmail: string) => {
  const response = await fetch(`/api/camps`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...campData, userEmail })
  });
  return response.json();
};

export const deleteCamp = async (campId: string, userEmail: string) => {
  const response = await fetch(`/api/camps`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: campId, userEmail })
  });
  return response.json();
};

// Room API
export const getRooms = async (campId: string, forceRefresh: boolean = false): Promise<Room[]> => {
  const cacheKey = `rooms_${campId}`;
  if (!forceRefresh) {
    const cached = cache.get<Room[]>(cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(`/api/rooms?campId=${campId}`);
  const data = await response.json();
  
  if (Array.isArray(data)) {
    cache.set(cacheKey, data, 2 * 60 * 1000); // 2 dakika cache
  }
  
  return data;
};

export const createRoom = async (roomData: any, userEmail: string) => {
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...roomData, userEmail })
  });
  const data = await response.json();
  
  // Cache'i temizle
  if (!data.error) {
    cache.clearPattern(`rooms_${roomData.campId}`);
    cache.clearPattern(`stats_${roomData.campId}`);
  }
  
  return data;
};

export const updateRoom = async (roomData: any, userEmail: string) => {
  const response = await fetch('/api/rooms', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...roomData, userEmail })
  });
  return response.json();
};

export const deleteRoom = async (id: string, campId: string, userEmail: string) => {
  const response = await fetch('/api/rooms', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _id: id, campId, userEmail })
  });
  return response.json();
};

// Worker API
export const getWorkers = async (campId?: string, roomId?: string, forceRefresh: boolean = false): Promise<Worker[]> => {
  const cacheKey = `workers_${campId || 'all'}_${roomId || 'all'}`;
  if (!forceRefresh) {
    const cached = cache.get<Worker[]>(cacheKey);
    if (cached) return cached;
  }

  let url = '/api/workers';
  const params = new URLSearchParams();
  
  if (campId) {
    params.append('campId', campId);
  }
  if (roomId) {
    params.append('roomId', roomId);
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (Array.isArray(data)) {
    cache.set(cacheKey, data, 2 * 60 * 1000); // 2 dakika cache
  }
  
  return data;
};

export const createWorker = async (workerData: any, userEmail: string) => {
  const response = await fetch('/api/workers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...workerData, userEmail })
  });
  const data = await response.json();
  
  // Cache'i temizle
  if (!data.error) {
    cache.clearPattern(`workers_${workerData.campId}`);
    cache.clearPattern(`stats_${workerData.campId}`);
  }
  
  return data;
};

export const updateWorker = async (workerData: any, userEmail: string) => {
  const response = await fetch('/api/workers', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...workerData, userEmail })
  });
  const data = await response.json();
  // Cache'i temizle
  if (!data.error) {
    cache.clearPattern(`workers_${workerData.campId}`);
    cache.clearPattern(`rooms_${workerData.campId}`);
    cache.clearPattern(`stats_${workerData.campId}`);
  }
  return data;
};

export const deleteWorker = async (id: string, userEmail: string, campId?: string) => {
  const response = await fetch('/api/workers', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _id: id, userEmail })
  });
  const data = await response.json();
  // Cache'i temizle
  if (!data.error && campId) {
    cache.clearPattern(`workers_${campId}`);
    cache.clearPattern(`rooms_${campId}`);
    cache.clearPattern(`stats_${campId}`);
  }
  return data;
};

interface ImportResponse {
  message: string;
  results: {
    success: number;
    failed: number;
    errors: string[];
  };
}

interface ErrorResponse {
  error: string;
}

type ApiResponse<T> = T | ErrorResponse;

// Excel import fonksiyonları
export const importRooms = async (campId: string, roomsData: any[], userEmail: string): Promise<ApiResponse<ImportResponse>> => {
  try {
    const response = await fetch(`/api/rooms/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ campId, rooms: roomsData, userEmail }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Odalar içe aktarılırken bir hata oluştu');
    }
    
    return await response.json();
  } catch (error: any) {
    return { error: error.message };
  }
};

export const importWorkers = async (campId: string, workersData: any[], userEmail: string): Promise<ApiResponse<ImportResponse>> => {
  try {
    const response = await fetch(`/api/workers/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ campId, workers: workersData, userEmail }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'İşçiler içe aktarılırken bir hata oluştu');
    }
    
    return await response.json();
  } catch (error: any) {
    return { error: error.message };
  }
};

export const generateShareCodes = async (campId: string) => {
  const response = await fetch(`/api/camps/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campId })
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const joinCamp = async (code: string, userEmail: string) => {
  const response = await fetch(`/api/camps/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, userEmail })
  });
  return response.json();
};

export const leaveCamp = async (campId: string, userEmail: string) => {
  const response = await fetch(`/api/camps/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campId, userEmail })
  });
  return response.json();
};

// Report API
export const getCampStats = async (campId: string) => {
  const cacheKey = `stats_${campId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(`/api/reports/stats?campId=${campId}`);
  const data = await response.json();
  
  if (!data.error) {
    cache.set(cacheKey, data, 30 * 1000); // 30 saniye cache (test için)
  }
  
  return data;
}; 