#!/usr/bin/env node
import path from "path";
import fs from "fs";
import chalk from "chalk";
import * as prompts from "@inquirer/prompts";
import { Command } from "commander";
import decamelize from "decamelize";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const program = new Command();

program
  .name("component-for-applet")
  .description("CLI to add global component for applet.")
  .version("0.0.1");

async function chooseComponent() {
  const component = await prompts.select({
    message: "Choose a component to register",
    choices: [
      {
        name: "PrivacyModal",
        value: "PrivacyModal",
        description: "Private component for Mini Programs",
      },
    ],
  });
  const componentName = await prompts.input({
    message: "Folder's name for component.",
    default: component,
  });
  return {
    component,
    componentName,
  };
}

/**
 * check destination's access
 * @param {string} dest
 */
async function checkAccess(dest) {
  try {
    fs.accessSync(dest);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

/**
 * cp template to dest
 * @param {string} component
 * @param {string} componentName
 * @param {string} dest
 */
async function copyTempToDestination(component, componentName, dest) {
  await checkAccess(dest);
  const source = path.resolve(__dirname, "templates/" + component);
  const target = path.resolve(dest, "components/" + componentName);
  try {
    fs.cpSync(source, target, {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
  } catch (err) {
    console.log(err.message);
    console.log(
      chalk.red(
        "Copy failed. Please check if the destination is existed already."
      )
    );
    process.exit(1);
  }
  console.log(chalk.green("Copy success."));
}

/**
 * edit app.json
 * @param {string} componentName
 * @param {string} dest
 */
async function editAppJson(componentName, dest) {
  const decamelName = decamelize(componentName, { separator: "-" });
  const target = path.resolve(dest, "app.json");
  try {
    fs.accessSync(target);
  } catch {
    console.log(chalk.red("Edit app.json failed. App.json does not exist. "));
    process.exit(1);
  }
  const kv = { [decamelName]: `components/${componentName}` };
  const code = fs.readFileSync(target, { encoding: "utf-8" });
  const config = JSON.parse(code);
  if (config.usingComponents) {
    if (config.usingComponents[decamelName]) {
      console.log(
        chalk.red(`${decamelName} is existed in usingComponents of app.json.`)
      );
      process.exit(1);
    }
    config.usingComponents = { ...config.usingComponents, ...kv };
  } else {
    config.usingComponents = kv;
  }
  fs.writeFileSync(target, JSON.stringify(config, null, 2), "utf-8");
  console.log(chalk.green("Edit app.json success."));
}

program
  .command("create")
  .description("Create global component for applet.")
  .argument(
    "[destination]",
    "Destination to create template. Default to be process.cwd()",
    process.cwd()
  )
  .action(async function (destination) {
    destination = path.normalize(destination);
    await checkAccess(destination);
    console.log(chalk.cyan("[Root Directory] ") + destination);
    const { component, componentName } = await chooseComponent();
    console.log(chalk.bgCyan("Start Copy"));
    await copyTempToDestination(component, componentName, destination);
    console.log(chalk.bgCyan("Start Edit App.json"));
    await editAppJson(componentName, destination);
  });

async function main() {
  await program.parseAsync(process.argv);
}

main();
