import { z } from "zod";

const registroSchema = z
	.object({
		nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),

		// 🚀 Zod v4: Sintaxis de primer nivel y tree-shakeable
		email: z.email({ message: "El formato del correo es inválido" }),

		password: z.string().min(8, "length").regex(/[A-Z]/, "upper").regex(/[0-9]/, "number"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		// 🚀 Usamos un mensaje de texto real para la confirmación
		message: "Las contraseñas no coinciden",
		path: ["confirmPassword"],
	});

export type DatosRegistro = z.infer<typeof registroSchema>;

export function validarFormulario(datos: Record<string, string>) {
	const resultado = registroSchema.safeParse(datos);

	if (resultado.success) {
		return {
			exito: true,
			erroresCampos: {},
			reglasPassword: { length: true, upper: true, number: true },
		};
	}

	const errorTree = z.treeifyError(resultado.error);

	// 1. Extraemos los errores de la contraseña principal para el checklist (Booleanos)
	const passErrors = errorTree.properties?.password?.errors || [];
	const passwordErrorsSet = new Set(passErrors);

	const reglasPassword = {
		length: !passwordErrorsSet.has("length"),
		upper: !passwordErrorsSet.has("upper"),
		number: !passwordErrorsSet.has("number"),
	};

	// 2. Construimos el diccionario de errores visuales (Textos Rojos)
	const erroresCampos: Record<string, string[]> = {};

	if (errorTree.properties?.nombre?.errors?.length) {
		erroresCampos.nombre = errorTree.properties.nombre.errors;
	}

	if (errorTree.properties?.email?.errors?.length) {
		erroresCampos.email = errorTree.properties.email.errors;
	}

	// 🚀 Agregamos el error de "confirmPassword" al diccionario de textos
	if (errorTree.properties?.confirmPassword?.errors?.length) {
		erroresCampos.confirmPassword = errorTree.properties.confirmPassword.errors;
	}

	return {
		exito: false,
		erroresCampos,
		reglasPassword,
	};
}
