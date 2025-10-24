export const authUtils = {
  setToken: (token) => {
    localStorage.setItem("taxpilot_token", token); // ✅ Nome corretto
  },
  
  getToken: () => {
    return localStorage.getItem("taxpilot_token"); // ✅ Nome corretto
  },
  
  removeToken: () => {
    localStorage.removeItem("taxpilot_token"); // ✅ Nome corretto
  },
  
  isAuthenticated: () => {
    const token = localStorage.getItem("taxpilot_token"); // ✅ Nome corretto
    return !!token;
  },
  
  logout: () => {
    localStorage.removeItem("taxpilot_token"); // ✅ Nome corretto
    window.location.href = '/login';
  }
};