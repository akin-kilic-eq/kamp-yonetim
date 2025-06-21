import { Room, Worker } from '@/app/[camp]/types';

// Auth API
export const register = async (email: string, password: string) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
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
export const getCamps = async (userEmail: string) => {
  const response = await fetch(`/api/camps?userEmail=${userEmail}`);
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

export const updateCamp = async (campData: any) => {
  const response = await fetch(`/api/camps`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campData)
  });
  return response.json();
};

export const deleteCamp = async (campId: string) => {
  const response = await fetch(`/api/camps`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: campId })
  });
  return response.json();
};

// Room API
export const getRooms = async (campId: string): Promise<Room[]> => {
  const response = await fetch(`/api/rooms?campId=${campId}`);
  return response.json();
};

export const createRoom = async (roomData: any) => {
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roomData)
  });
  return response.json();
};

export const updateRoom = async (roomData: any) => {
  const response = await fetch('/api/rooms', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roomData)
  });
  return response.json();
};

export const deleteRoom = async (id: string) => {
  const response = await fetch('/api/rooms', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _id: id })
  });
  return response.json();
};

// Worker API
export const getWorkers = async (campId?: string, roomId?: string): Promise<Worker[]> => {
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
  return response.json();
};

export const createWorker = async (workerData: any) => {
  const response = await fetch('/api/workers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workerData)
  });
  return response.json();
};

export const updateWorker = async (workerData: any) => {
  const response = await fetch('/api/workers', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workerData)
  });
  return response.json();
};

export const deleteWorker = async (id: string) => {
  const response = await fetch('/api/workers', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _id: id })
  });
  return response.json();
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
export const importRooms = async (campId: string, roomsData: any[]): Promise<ApiResponse<ImportResponse>> => {
  try {
    const response = await fetch(`/api/rooms/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ campId, rooms: roomsData }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Odalar içe aktarılırken bir hata oluştu');
    }
    
    return await response.json();
  } catch (error: any) {
    return { error: error.message };
  }
};

export const importWorkers = async (campId: string, workersData: any[]): Promise<ApiResponse<ImportResponse>> => {
  try {
    const response = await fetch(`/api/workers/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ campId, workers: workersData }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'İşçiler içe aktarılırken bir hata oluştu');
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