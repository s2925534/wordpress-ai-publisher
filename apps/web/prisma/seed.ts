import { PrismaClient } from '@prisma/client';

import { createDefaultContentProfile } from '../server/default-config';

const prisma = new PrismaClient();

async function main() {
  const profile = createDefaultContentProfile();

  await prisma.contentProfile.upsert({
    where: { profileKey: profile.profileKey },
    update: {
      name: profile.name,
      description: profile.description,
      outputOrder: profile.outputOrder,
      writingRules: profile.writingStyle,
      hashtagRules: profile.sections.linkedinPost,
      categoryRules: profile.sections.recommendedCategories,
      imageRules: profile.sections.featureImage,
      seoRules: profile.sections.title,
      urlRules: profile.sections.suggestedImageFileName,
      qualityRules: profile.sections.excerpt,
      isDefault: true
    },
    create: {
      profileKey: profile.profileKey,
      name: profile.name,
      description: profile.description,
      outputOrder: profile.outputOrder,
      writingRules: profile.writingStyle,
      hashtagRules: profile.sections.linkedinPost,
      categoryRules: profile.sections.recommendedCategories,
      imageRules: profile.sections.featureImage,
      seoRules: profile.sections.title,
      urlRules: profile.sections.suggestedImageFileName,
      qualityRules: profile.sections.excerpt,
      isDefault: true
    }
  });

  await prisma.localSetting.upsert({
    where: { key: 'bootstrap.version' },
    update: { value: 'phase-1' },
    create: {
      key: 'bootstrap.version',
      value: 'phase-1'
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
