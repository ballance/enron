import { useState } from 'react';
import { usePeople } from '../../hooks/usePeople';

const PersonSelector = ({ onSelect, selectedPerson }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = usePeople(1, 20, { search: searchQuery });
  const people = data?.people || [];

  const handleSelect = (person) => {
    onSelect(person);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      {selectedPerson ? (
        // Selected person display
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex-1">
            <div className="font-medium text-gray-900">
              {selectedPerson.name || selectedPerson.email}
            </div>
            {selectedPerson.name && (
              <div className="text-sm text-gray-600">{selectedPerson.email}</div>
            )}
          </div>
          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        // Search interface
        <div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a person by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Search results dropdown */}
          {isOpen && searchQuery && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : people.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No people found
                </div>
              ) : (
                <div>
                  {people.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleSelect(person)}
                      className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {person.name || person.email}
                      </div>
                      {person.name && (
                        <div className="text-sm text-gray-600">{person.email}</div>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>Sent: {person.sent_count?.toLocaleString() || 0}</span>
                        <span>Received: {person.received_count?.toLocaleString() || 0}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default PersonSelector;
