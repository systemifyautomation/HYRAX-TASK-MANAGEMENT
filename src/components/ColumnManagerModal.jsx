import { useState } from 'react';
import { X, Plus, Check, Settings, Trash2 } from 'lucide-react';

const ColumnManagerModal = ({ 
  showColumnManager, 
  setShowColumnManager, 
  columns, 
  onAddColumn, 
  onUpdateColumn, 
  onDeleteColumn 
}) => {
  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'text',
    dropdownOptions: [],
  });
  const [editingColumn, setEditingColumn] = useState(null);

  if (!showColumnManager) return null;

  const handleAddColumn = () => {
    if (newColumn.name.trim()) {
      const columnData = {
        name: newColumn.name,
        key: newColumn.name.toLowerCase().replace(/\s+/g, '_'),
        type: newColumn.type,
        visible: true,
        canDelete: true,
        options: newColumn.type === 'dropdown' ? newColumn.dropdownOptions.filter(opt => opt.trim()) : undefined,
      };
      onAddColumn(columnData);
      setNewColumn({
        name: '',
        type: 'text',
        dropdownOptions: [],
      });
    }
  };

  const handleSaveColumn = () => {
    if (editingColumn) {
      const updatedColumn = {
        ...editingColumn,
        options: editingColumn.type === 'dropdown'
          ? (Array.isArray(editingColumn.options)
            ? editingColumn.options
            : editingColumn.options?.split(',').map(opt => opt.trim()).filter(opt => opt))
          : undefined,
      };
      onUpdateColumn(editingColumn.id, updatedColumn);
      setEditingColumn(null);
    }
  };

  const handleEditColumn = (column) => {
    setEditingColumn({
      ...column,
      options: column.options ? column.options.join(', ') : '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-md border border-red-600 rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-red-600">Manage Columns</h3>
          <button onClick={() => setShowColumnManager(false)} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Add New Column */}
        <div className="mb-6 p-6 bg-gray-900 border border-red-600/30 rounded-lg">
          <h4 className="font-semibold text-white mb-4 text-lg">Add New Column</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Column Name</label>
              <input
                type="text"
                value={newColumn.name}
                onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                placeholder="e.g., Status, Priority, Notes"
                className="w-full px-4 py-2.5 bg-gray-800 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Column Type</label>
              <select
                value={newColumn.type}
                onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value, dropdownOptions: e.target.value === 'dropdown' ? [''] : [] })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-red-600/50 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-red-600"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="url">URL</option>
                <option value="array">Array (Multiple URLs)</option>
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
                <option value="dropdown">Dropdown</option>
                <option value="user">User</option>
                <option value="campaign">Campaign</option>
              </select>
            </div>
            {newColumn.type === 'dropdown' && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">Dropdown Options</label>
                <div className="space-y-2">
                  {newColumn.dropdownOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newColumn.dropdownOptions];
                          newOptions[index] = e.target.value;
                          setNewColumn({ ...newColumn, dropdownOptions: newOptions });
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-4 py-2 bg-gray-800 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                      />
                      <button
                        onClick={() => {
                          const newOptions = newColumn.dropdownOptions.filter((_, i) => i !== index);
                          setNewColumn({ ...newColumn, dropdownOptions: newOptions });
                        }}
                        className="p-2 text-red-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Remove option"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setNewColumn({ ...newColumn, dropdownOptions: [...newColumn.dropdownOptions, ''] })}
                    className="w-full px-4 py-2 bg-gray-800 border border-red-600/30 hover:border-red-600/50 text-red-500 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Option</span>
                  </button>
                </div>
              </div>
            )}
            <button onClick={handleAddColumn} className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-red-600/50">
              Add Column
            </button>
          </div>
        </div>

        {/* Existing Columns */}
        <div>
          <h4 className="font-semibold text-white mb-4 text-lg">Existing Columns</h4>
          <div className="space-y-3">
            {columns.map((column) => (
              <div key={column.id} className="p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                {editingColumn?.id === column.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Column Name</label>
                      <input
                        type="text"
                        value={editingColumn.name}
                        onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                        placeholder="Column name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Column Type</label>
                      <select
                        value={editingColumn.type}
                        onChange={(e) => setEditingColumn({ ...editingColumn, type: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-red-600/50 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-red-600"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="url">URL</option>
                        <option value="date">Date</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="user">User</option>
                        <option value="campaign">Campaign</option>
                      </select>
                    </div>
                    {editingColumn.type === 'dropdown' && (
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Dropdown Options</label>
                        <div className="space-y-2">
                          {(Array.isArray(editingColumn.options) ? editingColumn.options : editingColumn.options?.split(',') || []).map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const optionsArray = Array.isArray(editingColumn.options) ? editingColumn.options : editingColumn.options?.split(',') || [];
                                  const newOptions = [...optionsArray];
                                  newOptions[index] = e.target.value;
                                  setEditingColumn({ ...editingColumn, options: newOptions });
                                }}
                                placeholder={`Option ${index + 1}`}
                                className="flex-1 px-4 py-2 bg-gray-800 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                              />
                              <button
                                onClick={() => {
                                  const optionsArray = Array.isArray(editingColumn.options) ? editingColumn.options : editingColumn.options?.split(',') || [];
                                  const newOptions = optionsArray.filter((_, i) => i !== index);
                                  setEditingColumn({ ...editingColumn, options: newOptions });
                                }}
                                className="p-2 text-red-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Remove option"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const optionsArray = Array.isArray(editingColumn.options) ? editingColumn.options : editingColumn.options?.split(',') || [];
                              setEditingColumn({ ...editingColumn, options: [...optionsArray, ''] });
                            }}
                            className="w-full px-4 py-2 bg-gray-800 border border-red-600/30 hover:border-red-600/50 text-red-500 rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Option</span>
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveColumn}
                        className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setEditingColumn(null)}
                        className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">{column.name}</p>
                      <p className="text-sm text-gray-400 capitalize mt-1">{column.type}</p>
                      {column.type === 'dropdown' && column.options && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {column.options.map((opt, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-red-900/30 text-red-400 border border-red-600/30 rounded">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditColumn(column)}
                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-1"
                        title="Edit column"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onDeleteColumn(column.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center space-x-1 ${
                          column.canDelete 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                        title={column.canDelete ? "Delete column" : "Built-in column cannot be deleted"}
                        disabled={!column.canDelete}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnManagerModal;
