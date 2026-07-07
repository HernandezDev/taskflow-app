import { z } from "zod";

// 1. Añadimos Nombre y Email al esquema maestro
const registroSchema = z.object({
  nombre: z.string().min(4, "nombre_valido"), // Mínimo 4 letras
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
  const resultado = registroSchema.safeParse({ nombre, email, password, confirmPassword });

  if (resultado.success) {
    return { nombreOk: true, emailOk: true, length: true, upper: true, number: true, match: true };
  }

  const erroresSet = new Set(resultado.error.issues.map(issue => issue.message));

  return {
    // Usamos .has() en lugar de .includes(). Es infinitamente más rápido a nivel de CPU.
    nombreOk: nombre.trim() !== "" && !erroresSet.has("nombre_valido"),
    emailOk: email.trim() !== "" && !erroresSet.has("email_valido"),
    
    length: !erroresSet.has("length"),
    upper: !erroresSet.has("upper"),
    number: !erroresSet.has("number"),
    match: password !== "" && !erroresSet.has("match"),
  };
}