'use client';

import { useState, useEffect } from 'react';

interface Event {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handlelogout = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/logout', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to logout');
      }

      window.location.href = '/';
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const fetchEvents = async () => {
    try {
        const startDateFormatted = startDate ? new Date(startDate).toISOString() : '';
        const endDateFormatted = endDate ? new Date(endDate).toISOString() : '';
    
        const query = new URLSearchParams({
          ...(startDateFormatted && { startDate: startDateFormatted }), // Adjusted query parameter for Google Calendar API
          ...(endDateFormatted && { endDate: endDateFormatted }),   // Adjusted query parameter for Google Calendar API
        }).toString();

      const response = await fetch(`http://localhost:4000/api/calendar/events?${query}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Your Calendar Events</h1>
                <div className="mt-3 sm:mt-0 flex space-x-4">
                  <div className="flex flex-col">
                    <label htmlFor="start-date" className="text-sm text-gray-600">Start Date</label>
                    <input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full rounded-md border-gray-800 shadow-sm focus:border-blue-700 focus:ring-blue-700 text-gray-900"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="end-date" className="text-sm text-gray-600">End Date</label>
                    <input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block w-full rounded-md border-gray-800 shadow-sm focus:border-blue-700 focus:ring-blue-700 text-gray-900"
                    />
                  </div>
                  <button
                    onClick={handlelogout}
                    className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 self-end"
                  >
                    Logout
                  </button>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{event.summary}</div>
                        {event.description && (
                          <div className="text-sm text-gray-500">{event.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(event.start.dateTime).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(event.start.dateTime).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {event.location || 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
