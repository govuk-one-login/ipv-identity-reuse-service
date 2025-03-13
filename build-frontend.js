import { build } from 'esbuild';
import fs from 'fs-extra';
import path from 'path';

const createAssets = async () => {
  try {
    await copyFileWithSameName('node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css', '.aws-sam/build/UiFunction/assets/');
    await copyFileWithSameName('node_modules/govuk-frontend/dist/govuk/assets/manifest.json', '.aws-sam/build/UiFunction/assets/');
    await copyFileWithSameName('node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.js', '.aws-sam/build/UiFunction/assets/');
    await fs.copy('node_modules/govuk-frontend/dist/govuk/assets/images', '.aws-sam/build/UiFunction/assets/images');
    await fs.copy('node_modules/govuk-frontend/dist/govuk/assets/fonts', '.aws-sam/build/UiFunction/assets/fonts');
    console.log('Build successful!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
};

function copyFileWithSameName(filePath, destDir) {
  const filename = path.basename(filePath)
  return fs.copy(filePath, path.join(destDir, filename))
}

createAssets();
