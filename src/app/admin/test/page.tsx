"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function TestPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("TestPage mounted!")
    fetch("http://localhost:8000/api/v1/stations?page=1&page_size=5&active_only=true")
      .then(res => {
        console.log("Response status:", res.status)
        return res.json()
      })
      .then(json => {
        console.log("Data received:", json)
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        console.error("Fetch error:", err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Test Page</h1>
      
      <div style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
        <Link href="/admin" style={{ color: "blue", textDecoration: "underline" }}>Dashboard</Link>
        <Link href="/admin/stations" style={{ color: "blue", textDecoration: "underline" }}>Stations (RSC Nav)</Link>
        <Link href="/admin/trains" style={{ color: "blue", textDecoration: "underline" }}>Trains (RSC Nav)</Link>
        <a href="/admin/stations" style={{ color: "green", textDecoration: "underline" }}>Stations (Full Reload)</a>
      </div>
      
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {data && (
        <div>
          <p style={{ fontWeight: "bold" }}>Total stations: {data.total}</p>
          <pre style={{ background: "#f0f0f0", padding: "10px", overflow: "auto", maxHeight: "300px" }}>
            {JSON.stringify(data.items?.slice(0, 3), null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
