// User Preferences - Stores developer preferences and conventions
export interface UserPreference {
  id: string;
  userId: string;
  projectId?: string;
  category: 'code-style' | 'architecture' | 'tools' | 'conventions' | 'ai-behavior';
  key: string;
  value: any;
  scope: 'global' | 'project' | 'workspace';
  priority: number;
  lastUsed: Date;
}

export interface CodeStylePreferences {
  semicolons: boolean;
  quotes: 'single' | 'double';
  indentation: number;
  indentStyle: 'spaces' | 'tabs';
  trailingComma: boolean;
  bracketSpacing: boolean;
  arrowParens: 'always' | 'avoid';
}

export interface ArchitecturePreferences {
  componentStyle: 'functional' | 'class';
  stateManagement: string;
  styling: 'css' | 'scss' | 'tailwind' | 'css-modules' | 'styled-components';
  testingFramework: string;
  buildTool: string;
}

export interface ConventionPreferences {
  namingConvention: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case';
  fileStructure: 'flat' | 'feature-based' | 'layered';
  commentStyle: 'jsdoc' | 'inline' | 'minimal';
  typeAnnotations: boolean;
}

export interface AIBehaviorPreferences {
  autoSuggest: boolean;
  autoComplete: boolean;
  codeExplanation: boolean;
  refactoring: boolean;
  testGeneration: boolean;
  contextLimit: number;
  modelPreference: string;
}

export class UserPreferences {
  private preferences: Map<string, UserPreference[]> = new Map();

  addPreference(preference: Omit<UserPreference, 'id' | 'lastUsed'>): UserPreference {
    const record: UserPreference = {
      ...preference,
      id: crypto.randomUUID(),
      lastUsed: new Date(),
    };

    const key = `${preference.userId}-${preference.scope}`;
    if (!this.preferences.has(key)) {
      this.preferences.set(key, []);
    }

    // Remove existing preference with same key
    const existing = this.preferences.get(key)!.filter(p => p.key !== preference.key);
    this.preferences.set(key, [...existing, record]);

    return record;
  }

  getPreference(userId: string, key: string, scope: 'global' | 'project' | 'workspace'): UserPreference | undefined {
    const projectKey = `${userId}-${scope}`;
    const userPrefs = this.preferences.get(projectKey) || [];
    return userPrefs.find(p => p.key === key);
  }

  getPreferencesByCategory(
    userId: string,
    category: UserPreference['category'],
    scope?: 'global' | 'project' | 'workspace'
  ): UserPreference[] {
    const scopes = scope ? [scope] : ['global', 'project', 'workspace'];
    const results: UserPreference[] = [];

    for (const s of scopes) {
      const key = `${userId}-${s}`;
      const prefs = this.preferences.get(key) || [];
      results.push(...prefs.filter(p => p.category === category));
    }

    // Sort by priority (higher first)
    return results.sort((a, b) => b.priority - a.priority);
  }

  getProjectPreferences(userId: string, projectId: string): UserPreference[] {
    const globalKey = `${userId}-global`;
    const projectKey = `${userId}-project`;

    const globalPrefs = this.preferences.get(globalKey) || [];
    const projectPrefs = this.preferences.get(projectKey) || [];

    // Project preferences override global preferences
    const combined = [...globalPrefs];
    projectPrefs.forEach(pp => {
      const index = combined.findIndex(gp => gp.key === pp.key);
      if (index >= 0) {
        combined[index] = pp;
      } else {
        combined.push(pp);
      }
    });

    return combined;
  }

  updatePreference(userId: string, key: string, value: any, scope: 'global' | 'project' | 'workspace'): UserPreference | undefined {
    const pref = this.getPreference(userId, key, scope);
    if (!pref) return undefined;

    return this.addPreference({
      userId,
      projectId: pref.projectId,
      category: pref.category,
      key,
      value,
      scope,
      priority: pref.priority,
    });
  }

  deletePreference(userId: string, key: string, scope: 'global' | 'project' | 'workspace'): boolean {
    const keyString = `${userId}-${scope}`;
    const prefs = this.preferences.get(keyString);
    if (!prefs) return false;

    const index = prefs.findIndex(p => p.key === key);
    if (index === -1) return false;

    prefs.splice(index, 1);
    return true;
  }

  // Convenience methods for common preferences
  getCodeStylePreferences(userId: string, projectId?: string): CodeStylePreferences {
    const prefs = this.getProjectPreferences(userId, projectId || 'default');
    const stylePrefs = prefs.filter(p => p.category === 'code-style');

    return {
      semicolons: this.getPrefValue(stylePrefs, 'semicolons', true),
      quotes: this.getPrefValue(stylePrefs, 'quotes', 'single'),
      indentation: this.getPrefValue(stylePrefs, 'indentation', 2),
      indentStyle: this.getPrefValue(stylePrefs, 'indentStyle', 'spaces'),
      trailingComma: this.getPrefValue(stylePrefs, 'trailingComma', true),
      bracketSpacing: this.getPrefValue(stylePrefs, 'bracketSpacing', true),
      arrowParens: this.getPrefValue(stylePrefs, 'arrowParens', 'always'),
    };
  }

  setCodeStylePreferences(userId: string, projectId: string, prefs: Partial<CodeStylePreferences>): void {
    const entries = Object.entries(prefs) as [string, any][];

    entries.forEach(([key, value]) => {
      this.addPreference({
        userId,
        projectId,
        category: 'code-style',
        key,
        value,
        scope: 'project',
        priority: 1,
      });
    });
  }

  getArchitecturePreferences(userId: string, projectId?: string): ArchitecturePreferences {
    const prefs = this.getProjectPreferences(userId, projectId || 'default');
    const archPrefs = prefs.filter(p => p.category === 'architecture');

    return {
      componentStyle: this.getPrefValue(archPrefs, 'componentStyle', 'functional'),
      stateManagement: this.getPrefValue(archPrefs, 'stateManagement', ''),
      styling: this.getPrefValue(archPrefs, 'styling', 'css'),
      testingFramework: this.getPrefValue(archPrefs, 'testingFramework', ''),
      buildTool: this.getPrefValue(archPrefs, 'buildTool', ''),
    };
  }

  setArchitecturePreferences(userId: string, projectId: string, prefs: Partial<ArchitecturePreferences>): void {
    const entries = Object.entries(prefs) as [string, any][];

    entries.forEach(([key, value]) => {
      this.addPreference({
        userId,
        projectId,
        category: 'architecture',
        key,
        value,
        scope: 'project',
        priority: 1,
      });
    });
  }

  getConventionPreferences(userId: string, projectId?: string): ConventionPreferences {
    const prefs = this.getProjectPreferences(userId, projectId || 'default');
    const convPrefs = prefs.filter(p => p.category === 'conventions');

    return {
      namingConvention: this.getPrefValue(convPrefs, 'namingConvention', 'camelCase'),
      fileStructure: this.getPrefValue(convPrefs, 'fileStructure', 'feature-based'),
      commentStyle: this.getPrefValue(convPrefs, 'commentStyle', 'jsdoc'),
      typeAnnotations: this.getPrefValue(convPrefs, 'typeAnnotations', true),
    };
  }

  setConventionPreferences(userId: string, projectId: string, prefs: Partial<ConventionPreferences>): void {
    const entries = Object.entries(prefs) as [string, any][];

    entries.forEach(([key, value]) => {
      this.addPreference({
        userId,
        projectId,
        category: 'conventions',
        key,
        value,
        scope: 'project',
        priority: 1,
      });
    });
  }

  getAIBehaviorPreferences(userId: string, projectId?: string): AIBehaviorPreferences {
    const prefs = this.getProjectPreferences(userId, projectId || 'default');
    const aiPrefs = prefs.filter(p => p.category === 'ai-behavior');

    return {
      autoSuggest: this.getPrefValue(aiPrefs, 'autoSuggest', true),
      autoComplete: this.getPrefValue(aiPrefs, 'autoComplete', true),
      codeExplanation: this.getPrefValue(aiPrefs, 'codeExplanation', true),
      refactoring: this.getPrefValue(aiPrefs, 'refactoring', true),
      testGeneration: this.getPrefValue(aiPrefs, 'testGeneration', true),
      contextLimit: this.getPrefValue(aiPrefs, 'contextLimit', 100000),
      modelPreference: this.getPrefValue(aiPrefs, 'modelPreference', ''),
    };
  }

  setAIBehaviorPreferences(userId: string, projectId: string, prefs: Partial<AIBehaviorPreferences>): void {
    const entries = Object.entries(prefs) as [string, any][];

    entries.forEach(([key, value]) => {
      this.addPreference({
        userId,
        projectId,
        category: 'ai-behavior',
        key,
        value,
        scope: 'project',
        priority: 1,
      });
    });
  }

  private getPrefValue<T>(prefs: UserPreference[], key: string, defaultValue: T): T {
    const pref = prefs.find(p => p.key === key);
    return pref !== undefined ? pref.value : defaultValue;
  }

  inferPreferencesFromConfig(userId: string, projectId: string, config: any): void {
    // Infer from ESLint config
    if (config.eslint) {
      if (config.eslint.rules?.semi?.[0] === 'always') {
        this.addPreference({
          userId,
          projectId,
          category: 'code-style',
          key: 'semicolons',
          value: true,
          scope: 'project',
          priority: 0.8,
        });
      }

      if (config.eslint.rules?.quotes?.[1] === 'single') {
        this.addPreference({
          userId,
          projectId,
          category: 'code-style',
          key: 'quotes',
          value: 'single',
          scope: 'project',
          priority: 0.8,
        });
      }
    }

    // Infer from Prettier config
    if (config.prettier) {
      if (config.prettier.semi !== undefined) {
        this.addPreference({
          userId,
          projectId,
          category: 'code-style',
          key: 'semicolons',
          value: config.prettier.semi,
          scope: 'project',
          priority: 0.8,
        });
      }

      if (config.prettier.singleQuote !== undefined) {
        this.addPreference({
          userId,
          projectId,
          category: 'code-style',
          key: 'quotes',
          value: config.prettier.singleQuote ? 'single' : 'double',
          scope: 'project',
          priority: 0.8,
        });
      }

      if (config.prettier.tabWidth !== undefined) {
        this.addPreference({
          userId,
          projectId,
          category: 'code-style',
          key: 'indentation',
          value: config.prettier.tabWidth,
          scope: 'project',
          priority: 0.8,
        });
      }

      if (config.prettier.useTabs !== undefined) {
        this.addPreference({
          userId,
          projectId,
          category: 'code-style',
          key: 'indentStyle',
          value: config.prettier.useTabs ? 'tabs' : 'spaces',
          scope: 'project',
          priority: 0.8,
        });
      }
    }

    // Infer from TypeScript config
    if (config.tsconfig) {
      if (config.tsconfig.compilerOptions?.strict) {
        this.addPreference({
          userId,
          projectId,
          category: 'conventions',
          key: 'typeAnnotations',
          value: true,
          scope: 'project',
          priority: 0.9,
        });
      }
    }
  }

  clearUserPreferences(userId: string): void {
    this.preferences.delete(`${userId}-global`);
    this.preferences.delete(`${userId}-project`);
    this.preferences.delete(`${userId}-workspace`);
  }

  exportPreferences(userId: string, projectId?: string): string {
    const prefs = this.getProjectPreferences(userId, projectId || 'default');
    return JSON.stringify(prefs, null, 2);
  }

  importPreferences(userId: string, projectId: string, json: string): UserPreference[] {
    try {
      const prefs = JSON.parse(json) as UserPreference[];
      prefs.forEach(p => {
        this.addPreference({
          userId,
          projectId,
          category: p.category,
          key: p.key,
          value: p.value,
          scope: p.scope,
          priority: p.priority,
        });
      });
      return prefs;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return [];
    }
  }
}
