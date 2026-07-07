import { z } from "zod";

// 1. Añadimos Nombre y Email al esquema maestro
const registroSchema = z.object({
  nombre: z.string().min(2, "nombre_valido"), // Mínimo 2 letras
  email: z.string().email("email_valido"),    // Formato email válido
  password: z.string()
    .min(8, "length") 
    .regex(/[A-Z]/, "upper")
    .regex(/[0-9]/, "number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "match",
  path: ["confirmPassword"], 
});

export function evaluarReglasRegistro(nombre: string, email: string, password: string, confirmPassword: string) {
  // Estado inicial vacío
  if (!nombre && !email && !password && !confirmPassword) {
    return { 
      nombreOk: false, 
      emailOk: false, 
      length: false, 
      upper: false, 
      number: false, 
      match: false 
    };
  }

  const resultado = registroSchema.safeParse({ nombre, email, password, confirmPassword });

  // Si todo es perfecto
  if (resultado.success) {
    return { nombreOk: true, emailOk: true, length: true, upper: true, number: true, match: true };
  }

  // Extraemos nuestros "IDs secretos" que fallaron
  const erroresActivos = resultado.error.issues.map(issue => issue.message);

  return {
    // Es true (verde) si el campo NO está vacío y su ID de error NO está en la lista
    nombreOk: nombre.trim() !== "" && !erroresActivos.includes("nombre_valido"),
    emailOk: email.trim() !== "" && !erroresActivos.includes("email_valido"),
    
    length: !erroresActivos.includes("length"),
    upper: !erroresActivos.includes("upper"),
    number: !erroresActivos.includes("number"),
    match: password !== "" && !erroresActivos.includes("match"),
  };
}