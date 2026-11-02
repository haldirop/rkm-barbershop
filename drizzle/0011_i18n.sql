ALTER TABLE "appointments" ADD COLUMN "locale" text DEFAULT 'nl' NOT NULL;--> statement-breakpoint
ALTER TABLE "availability_alerts" ADD COLUMN "locale" text DEFAULT 'nl' NOT NULL;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "bio_en" text;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "bio_de" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "name_en" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "name_de" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "description_en" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "description_de" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tagline_en" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tagline_de" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_locale_chk" CHECK ("appointments"."locale" IN ('nl', 'en', 'de'));--> statement-breakpoint
ALTER TABLE "availability_alerts" ADD CONSTRAINT "availability_alerts_locale_chk" CHECK ("availability_alerts"."locale" IN ('nl', 'en', 'de'));
--> statement-breakpoint
-- English and German texts for the starting treatments and slogan (see src/server/db/default-translations.ts),
-- only where the Dutch text is still the original.
UPDATE "services" SET "name_en" = 'Haircut', "name_de" = 'Haarschnitt' WHERE "name" = 'Knippen' AND "name_en" IS NULL AND "name_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_en" = 'Classic or modern, tailored to your hair type. Including wash and styling.', "description_de" = 'Klassisch oder modern, abgestimmt auf deinen Haartyp. Inklusive Waschen und Styling.' WHERE "description" = 'Klassiek of modern, afgestemd op je haartype. Inclusief wassen en styling.' AND "description_en" IS NULL AND "description_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "name_en" = 'Skin Fade', "name_de" = 'Skin Fade' WHERE "name" = 'Skin Fade' AND "name_en" IS NULL AND "name_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_en" = 'A sharp fade down to the skin with a seamless transition. Finished with a razor.', "description_de" = 'Sauberer Fade bis auf die Haut mit nahtlosem Übergang. Mit dem Rasiermesser vollendet.' WHERE "description" = 'Strakke fade tot op de huid met een naadloze overgang. Afgewerkt met scheermes.' AND "description_en" IS NULL AND "description_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "name_en" = 'Haircut + Beard', "name_de" = 'Haarschnitt + Bart' WHERE "name" = 'Knippen + Baard' AND "name_en" IS NULL AND "name_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_en" = 'The complete treatment: a haircut and a shaped beard with sharp lines.', "description_de" = 'Das Komplettpaket: Haarschnitt und Bart in Form, mit sauberen Konturen.' WHERE "description" = 'Complete behandeling: knipbeurt en baard in model, met strakke contouren.' AND "description_en" IS NULL AND "description_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "name_en" = 'Beard', "name_de" = 'Bart' WHERE "name" = 'Baard' AND "name_en" IS NULL AND "name_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_en" = 'Beard trimmed and shaped, lines with the razor and nourishing oil.', "description_de" = 'Bart trimmen und in Form bringen, Konturen mit dem Messer und pflegendes Öl.' WHERE "description" = 'Baard trimmen en in model brengen, contouren met het mes en verzorgende olie.' AND "description_en" IS NULL AND "description_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "name_en" = 'Kids up to 12', "name_de" = 'Kinder bis 12 Jahre' WHERE "name" = 'Kinderen t/m 12 jaar' AND "name_en" IS NULL AND "name_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_en" = 'Cut calmly and with care, for our youngest guests.', "description_de" = 'Ruhig und mit Sorgfalt geschnitten, für unsere jüngsten Gäste.' WHERE "description" = 'Rustig en met aandacht geknipt, voor de jongste gasten.' AND "description_en" IS NULL AND "description_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "name_en" = 'Hot Towel Shave', "name_de" = 'Hot Towel Shave' WHERE "name" = 'Hot Towel Shave' AND "name_en" IS NULL AND "name_de" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_en" = 'A traditional shave with hot towels, shaving soap and a razor.', "description_de" = 'Traditionelle Rasur mit heißen Handtüchern, Rasierseife und Messer.' WHERE "description" = 'Traditioneel scheren met warme handdoeken, scheerzeep en mes.' AND "description_en" IS NULL AND "description_de" IS NULL;
--> statement-breakpoint
UPDATE "settings" SET "tagline_en" = 'Sharp cuts. Walk out confident.', "tagline_de" = 'Sauber geschnitten. Selbstbewusst unterwegs.' WHERE "tagline" = 'Strak geknipt. Zelfverzekerd naar buiten.' AND "tagline_en" IS NULL AND "tagline_de" IS NULL;
