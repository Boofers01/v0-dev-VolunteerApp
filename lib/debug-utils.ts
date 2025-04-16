// Debug utility to help track data flow issues
export const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0] // HH:MM:SS
  console.log(`[${timestamp}] ${message}`, data ? data : "")

  // Also add to localStorage for persistent debugging
  try {
    const logs = JSON.parse(localStorage.getItem("debugLogs") || "[]")
    logs.push({ timestamp, message, data: data ? JSON.stringify(data) : null })
    // Keep only the last 100 logs
    if (logs.length > 100) logs.shift()
    localStorage.setItem("debugLogs", JSON.stringify(logs))
  } catch (e) {
    console.error("Failed to save debug log:", e)
  }
}

// Clear debug logs
export const clearDebugLogs = () => {
  localStorage.removeItem("debugLogs")
}

// Get debug logs
export const getDebugLogs = () => {
  try {
    return JSON.parse(localStorage.getItem("debugLogs") || "[]")
  } catch (e) {
    console.error("Failed to get debug logs:", e)
    return []
  }
}
