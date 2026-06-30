import messages from "../messages/en.json";

/**
 * Augments next-intl with our message catalog so translation keys are
 * type-checked and autocompleted (e.g. `t("Board.Backlog.title")`).
 * `en.json` is the source of truth for available keys.
 */
declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messages;
  }
}
