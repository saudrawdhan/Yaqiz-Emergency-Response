import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import Sidebar from '../../components/common/Sidebar';
import './UserManagement.css';

interface User {
  id: string;
  name: string;
  email: string;
  type: 'Hospital' | 'Police' | 'Civil Defense' | 'Najm';
  contactNumber: string;
}

const UserManagement: React.FC = () => {
  const { showSuccess, showWarning } = useNotification();
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'King Abdullah Medical City',
      email: 'kamc@agency.gov',
      type: 'Hospital',
      contactNumber: '+966 12 345 6789'
    },
    {
      id: '2',
      name: 'Riyadh Central Police Dept.',
      email: 'rcpd@agency.gov',
      type: 'Police',
      contactNumber: '+966 11 234 5678'
    },
    {
      id: '3',
      name: 'Civil Defense Unit 5',
      email: 'cdu5@agency.gov',
      type: 'Civil Defense',
      contactNumber: '+966 11 345 6789'
    },
    {
      id: '4',
      name: 'Najm Dispatch',
      email: 'dispatch@najm.sa',
      type: 'Najm',
      contactNumber: '+966 11 456 7890'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: 'Hospital' as User['type'],
    contactNumber: ''
  });

  const getTypeColor = (type: User['type']) => {
    const colors = {
      'Hospital': 'type-hospital',
      'Police': 'type-police',
      'Civil Defense': 'type-civil-defense',
      'Najm': 'type-najm'
    };
    return colors[type];
  };

  const getTypeIcon = (type: User['type']) => {
    const icons = {
      'Hospital': 'local_hospital',
      'Police': 'local_police',
      'Civil Defense': 'local_fire_department',
      'Najm': 'directions_car'
    };
    return icons[type];
  };

  const handleAddUser = () => {
    if (formData.name && formData.email && formData.contactNumber) {
      const newUser: User = {
        id: Date.now().toString(),
        ...formData
      };
      setUsers([...users, newUser]);
      showSuccess(`User "${formData.name}" added successfully!`);
      setFormData({
        name: '',
        email: '',
        type: 'Hospital',
        contactNumber: ''
      });
      setShowModal(false);
    } else {
      showWarning('Please fill in all required fields.');
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      setUsers(users.filter(u => u.id !== id));
      showSuccess(`User "${name}" deleted successfully.`);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="user-management-layout">
      <Sidebar userRole="admin" />
      
      <main className="user-management-main">
        <div className="user-management-container">
          {/* Header */}
          <header className="page-header">
            <div>
              <h1 className="page-title">User Management</h1>
              <p className="page-subtitle">Manage agency users and permissions.</p>
            </div>
            <button className="btn-add-user" onClick={() => setShowModal(true)}>
              <span className="material-symbols-outlined">add</span>
              <span>Add Agency User</span>
            </button>
          </header>

          {/* Search */}
          <div className="search-container">
            <div className="search-box">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Search agency users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Users Grid */}
          <div className="users-grid">
            {filteredUsers.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-card-header">
                  <div className={`user-avatar ${getTypeColor(user.type)}`}>
                    <span className="material-symbols-outlined filled">
                      {getTypeIcon(user.type)}
                    </span>
                  </div>
                  <div className="user-info">
                    <h3 className="user-name">{user.name}</h3>
                    <p className="user-email">{user.email}</p>
                  </div>
                </div>

                <div className="user-card-body">
                  <div className="user-detail">
                    <span className="detail-label">Type</span>
                    <span className={`detail-value user-role-badge ${getTypeColor(user.type)}`}>
                      {user.type}
                    </span>
                  </div>
                  <div className="user-detail">
                    <span className="detail-label">Contact</span>
                    <span className="detail-value">{user.contactNumber}</span>
                  </div>
                </div>

                <div className="user-card-footer">
                  <button className="btn-edit" title="Edit">
                    <span className="material-symbols-outlined">edit</span>
                    <span>Edit</span>
                  </button>
                  <button className="btn-delete" title="Delete" onClick={() => handleDeleteUser(user.id, user.name)}>
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="empty-state">
                <span className="material-symbols-outlined">group_off</span>
                <p>No users found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Create New Emergency Unit</h2>
                <p className="modal-subtitle">Fill in the details below to create a new account.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleAddUser(); }}>
              <div className="form-group">
                <label htmlFor="name">Agency Name</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter the name of the agency"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">User Email</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g., contact@agency.gov"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Agency Type</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as User['type']})}
                  required
                >
                  <option value="Hospital">Hospital</option>
                  <option value="Police">Police Department</option>
                  <option value="Civil Defense">Civil Defense</option>
                  <option value="Najm">Najm</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="contact">Contact Number</label>
                <input
                  type="tel"
                  id="contact"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                  placeholder="Enter a contact phone number"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Save User
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
