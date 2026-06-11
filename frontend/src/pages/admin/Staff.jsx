import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Staff() {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'receptionist', specialization: '', customSpecialization: '', roomNumber: '' })
  const [loading, setLoading] = useState(true)

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = async () => {
    const res = await fetch('/api/users', { headers })
    setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (form.role === 'doctor') {
      const finalSpecialization = form.specialization === 'Other' ? form.customSpecialization : form.specialization;
      const payload = { ...form, specialization: finalSpecialization };
      await fetch('/api/doctors', { method: 'POST', headers, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/users', { method: 'POST', headers, body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role }) })
    }
    
    setForm({ name: '', email: '', password: '', role: 'receptionist', specialization: '', customSpecialization: '', roomNumber: '' })
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('Remove this staff member?')) {
      await fetch(`/api/users/${id}`, { method: 'DELETE', headers })
      load()
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div>
      <h2>👥 Staff Management</h2>
      <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>Add receptionist accounts</p>

      <form className="admin-form" onSubmit={handleSubmit}>
        <input className="form-control" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="form-control" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="form-control" type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        <select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="receptionist">Receptionist</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
        </select>
        
        {form.role === 'doctor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select className="form-control" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} required>
                <option value="">Select Specialization</option>
                <option value="General Physician">General Physician</option>
                <option value="Dentist">Dentist</option>
                <option value="Pediatrician">Pediatrician</option>
                <option value="Cardiologist">Cardiologist</option>
                <option value="Orthopedic">Orthopedic</option>
                <option value="Ophthalmologist">Ophthalmologist</option>
                <option value="Dermatologist">Dermatologist</option>
                <option value="ENT Specialist">ENT Specialist</option>
                <option value="Other">Other</option>
              </select>
              {form.specialization === 'Other' && (
                <input className="form-control" placeholder="Enter custom specialization" value={form.customSpecialization} onChange={(e) => setForm({ ...form, customSpecialization: e.target.value })} required />
              )}
            </div>
            <input className="form-control" placeholder="Room Number" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} required />
          </div>
        )}
        
        <button className="btn btn-primary" type="submit">+ Add Staff</button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td className="font-semibold">{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge-serving' : 'badge-waiting'}`}>{u.role}</span></td>
                <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(u._id)}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
