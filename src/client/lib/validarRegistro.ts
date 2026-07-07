import { z } from "zod";

const registroSchema = z
	.object({
		nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
		email: z.email("El formato del correo es inválido"),
		password: z.string().min(8, "length").regex(/[A-Z]/, "upper").regex(/[0-9]/, "number"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "match",
		path: ["confirmPassword"],
	});

export type DatosRegistro = z.infer<typeof registroSchema>;

export function validarFormulario(datos: Record<string, string>) {
	const resultado = registroSchema.safeParse(datos);

	if (resultado.success) {
		return {
			exito: true,
			erroresCampos: {},
			reglasPassword: { length: true, upper: true, number: true, match: true },
		};
	}

	// 🚀 ZOD v4: Usamos z.treeifyError para procesar el error
	const errorTree = z.treeifyError(resultado.error);

	// Extraemos los arrays de errores navegando de forma segura por el árbol (por si son undefined)
	const passErrors = errorTree.properties?.password?.errors || [];
	const confirmErrors = errorTree.properties?.confirmPassword?.errors || [];

	// Los unimos en nuestro Set de alta eficiencia O(1)
	const passwordErrorsSet = new Set([...passErrors, ...confirmErrors]);

	const reglasPassword = {
		length: !passwordErrorsSet.has("length"),
		upper: !passwordErrorsSet.has("upper"),
		number: !passwordErrorsSet.has("number"),
		match: datos.password !== "" && !passwordErrorsSet.has("match"),
	};

	// Construimos manualmente el diccionario de campos de texto (Nombre y Email)
	// Así evitamos mandar "length" o "match" a la interfaz de usuario
	const erroresCampos: Record<string, string[]> = {};

	if (errorTree.properties?.nombre?.errors?.length) {
		erroresCampos.nombre = errorTree.properties.nombre.errors;
	}
	if (errorTree.properties?.email?.errors?.length) {
		erroresCampos.email = errorTree.properties.email.errors;
	}

	return {
		exito: false,
		erroresCampos,
		reglasPassword,
	};
}
