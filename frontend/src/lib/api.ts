import axios from 'axios'
import { API_BASE_URL } from './constants'

// Instancia Axios configurada com a URL base do backend
export const api = axios.create({
  baseURL: API_BASE_URL,
})
