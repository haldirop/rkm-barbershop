ALTER TABLE "barbers" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "role_en" text;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "role_de" text;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "experience_since" smallint;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "is_certified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "is_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "intro" text;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "intro_en" text;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "intro_de" text;--> statement-breakpoint
-- Until now the homepage said in fixed text that Rohid is the owner, a certified barber with
-- 20 years of experience (written in 2026, so since 2006). Those facts move to his barber
-- record, where the owner can now change them under Beheer → Barbers.
UPDATE "barbers" SET
	"is_owner" = true,
	"is_certified" = true,
	"experience_since" = 2006,
	"role" = 'Eigenaar & barber',
	"role_en" = 'Owner & barber',
	"role_de" = 'Inhaber & Barber',
	"intro" = "name" || ' is de eigenaar van RKM Barbershop en gecertificeerd barber. Van een klassieke herensnit tot een strakke skin fade of een baard in model: je bent in ervaren handen.',
	"intro_en" = "name" || ' is the owner of RKM Barbershop and a certified barber. From a classic gentleman’s cut to a sharp skin fade or a shaped beard: you’re in experienced hands.',
	"intro_de" = "name" || ' ist der Inhaber von RKM Barbershop und zertifizierter Barber. Vom klassischen Herrenschnitt bis zum sauberen Skin Fade oder einem Bart in Form: Du bist in erfahrenen Händen.'
WHERE "name" ILIKE '%rohid%';
