## 1. Packaging
- [ ] 1.1 Split core and copilot/knowledge requirements.
- [ ] 1.2 Add lazy provider imports and actionable optional-dependency errors.
- [ ] 1.3 Define/test base and copilot-enabled PyInstaller build flavors.

## 2. Regression
- [ ] 2.1 Add import/startup test in an environment without optional packages.
- [ ] 2.2 Confirm `python tests/test_pipeline_writer.py` remains runnable with core dependencies only.
