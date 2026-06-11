import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Doctors() {
  const { token } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '', specialization: '', customSpecialization: '', roomNumber: '' })
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = async () => {
    const res = await fetch('/api/doctors', { headers })
    setDoctors(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const finalSpecialization = form.specialization === 'Other' ? form.customSpecialization : form.specialization;
      const payload = { ...form, specialization: finalSpecialization };

      const url = editing ? `/api/doctors/${editing}` : '/api/doctors'
      const method = editing ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
    } catch (err) { console.error(err) }
    setForm({ name: '', email: '', password: '', specialization: '', customSpecialization: '', roomNumber: '' })
    setEditing(null)
    load()
  }

  const handleEdit = (doc) => {
    setEditing(doc._id)
    const isStandard = ["General Physician", "Dentist", "Pediatrician", "Cardiologist", "Orthopedic", "Ophthalmologist", "Dermatologist", "ENT Specialist"].includes(doc.specialization);
    setForm({
      name: doc.name,
      email: '', // Not shown during edit but good to clear
      password: '', // Not updated through this form
      specialization: isStandard ? doc.specialization : 'Other',
      customSpecialization: isStandard ? '' : doc.specialization,
      roomNumber: doc.roomNumber
    })
  }

  const handleDelete = async (id) => {
    if (confirm('Deactivate this doctor?')) {
      await fetch(`/api/doctors/${id}`, { method: 'DELETE', headers })
      load()
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div>
      <h2>👨‍⚕️ Doctors Management</h2>
      <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>Add and manage clinic doctors</p>

      <form className="admin-form" onSubmit={handleSubmit}>
        <input className="form-control" placeholder="Doctor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        {!editing && (
          <>
            <input className="form-control" type="email" placeholder="Doctor email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="form-control" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </>
        )}
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
        <input className="form-control" placeholder="Room number" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} required />
        <button className="btn btn-primary" type="submit">{editing ? '✏ Update' : '+ Add Doctor'}</button>
        {editing && <button className="btn btn-outline" type="button" onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', specialization: '', customSpecialization: '', roomNumber: '' }) }}>Cancel</button>}
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Specialization</th>
              <th>Room</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doc) => (
              <tr key={doc._id}>
                <td className="font-semibold">{doc.name}</td>
                <td>{doc.specialization}</td>
                <td>{doc.roomNumber}</td>
                <td><span className={`badge ${doc.isActive ? 'badge-completed' : 'badge-skipped'}`}>{doc.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(doc)}>✏</button>
                    {doc.isActive && <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(doc._id)}>🗑</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
