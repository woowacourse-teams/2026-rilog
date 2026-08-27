'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import MermaidCodeBlockPreviewController from '@/shared/ui/mermaid-diagram/MermaidCodeBlockPreviewController';

interface CodeLanguageDropdownControllerProps {
	editor: {
		domElement?: HTMLElement;
	};
}

interface CodeLanguageDropdownProps {
	languageSelect: HTMLSelectElement;
}

interface LanguageOption {
	label: string;
	value: string;
}

const CODE_LANGUAGE_SELECT_SELECTOR = '.bn-block-content[data-content-type="codeBlock"] > div > select';

const getLanguageOptions = (languageSelect: HTMLSelectElement): LanguageOption[] =>
	Array.from(languageSelect.options, ({ text, value }) => ({ label: text, value }));

function CodeLanguageDropdown({ languageSelect }: CodeLanguageDropdownProps) {
	const listboxId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [selectedValue, setSelectedValue] = useState(languageSelect.value);
	const languageOptions = getLanguageOptions(languageSelect);
	const selectedIndex = Math.max(
		0,
		languageOptions.findIndex(({ value }) => value === selectedValue),
	);
	const selectedLabel = languageOptions[selectedIndex]?.label ?? selectedValue;

	useEffect(() => {
		const handleNativeChange = () => setSelectedValue(languageSelect.value);
		languageSelect.addEventListener('change', handleNativeChange);

		return () => languageSelect.removeEventListener('change', handleNativeChange);
	}, [languageSelect]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleOutsidePointerDown = (event: PointerEvent) => {
			if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('pointerdown', handleOutsidePointerDown);
		return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
	}, [isOpen]);

	const openAndFocusOption = (index: number) => {
		setIsOpen(true);
		requestAnimationFrame(() => optionRefs.current[index]?.focus());
	};

	const selectLanguage = (value: string) => {
		languageSelect.value = value;
		languageSelect.dispatchEvent(new Event('change', { bubbles: true }));
		setSelectedValue(value);
		setIsOpen(false);
		requestAnimationFrame(() =>
			rootRef.current?.querySelector<HTMLButtonElement>('.post-write-code-language-trigger')?.focus(),
		);
	};

	const moveOptionFocus = (currentIndex: number, direction: -1 | 1) => {
		const nextIndex = (currentIndex + direction + languageOptions.length) % languageOptions.length;
		optionRefs.current[nextIndex]?.focus();
	};

	return (
		<div className="post-write-code-language" ref={rootRef}>
			<button
				type="button"
				className="post-write-code-language-trigger"
				aria-controls={listboxId}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				aria-label={`코드 언어: ${selectedLabel}`}
				onClick={() => setIsOpen((isCurrentlyOpen) => !isCurrentlyOpen)}
				onKeyDown={(event) => {
					if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
						event.preventDefault();
						openAndFocusOption(event.key === 'ArrowDown' ? selectedIndex : languageOptions.length - 1);
					} else if (event.key === 'Escape' && isOpen) {
						event.preventDefault();
						setIsOpen(false);
					}
				}}
			>
				{selectedLabel}
			</button>
			{isOpen && (
				<div id={listboxId} className="post-write-code-language-listbox" role="listbox" aria-label="코드 언어">
					{languageOptions.map(({ label, value }, index) => (
						<button
							type="button"
							key={value}
							ref={(element) => {
								optionRefs.current[index] = element;
							}}
							className="post-write-code-language-option"
							role="option"
							aria-selected={value === selectedValue}
							onClick={() => selectLanguage(value)}
							onKeyDown={(event) => {
								if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
									event.preventDefault();
									moveOptionFocus(index, event.key === 'ArrowDown' ? 1 : -1);
								} else if (event.key === 'Home' || event.key === 'End') {
									event.preventDefault();
									optionRefs.current[event.key === 'Home' ? 0 : languageOptions.length - 1]?.focus();
								} else if (event.key === 'Escape') {
									setIsOpen(false);
									rootRef.current?.querySelector<HTMLButtonElement>('.post-write-code-language-trigger')?.focus();
								}
							}}
						>
							{label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export default function CodeLanguageDropdownController({ editor }: CodeLanguageDropdownControllerProps) {
	const [languageSelects, setLanguageSelects] = useState<HTMLSelectElement[]>([]);

	useEffect(() => {
		const editorElement = editor.domElement;
		if (editorElement === undefined) {
			return;
		}
		let managedLanguageSelects: HTMLSelectElement[] = [];

		const updateLanguageSelects = () => {
			const nextLanguageSelects = Array.from(
				editorElement.querySelectorAll<HTMLSelectElement>(CODE_LANGUAGE_SELECT_SELECTOR),
			);
			managedLanguageSelects = nextLanguageSelects;
			nextLanguageSelects.forEach((languageSelect) => {
				languageSelect.dataset.codeLanguageNative = '';
				languageSelect.setAttribute('aria-hidden', 'true');
				languageSelect.tabIndex = -1;
			});
			setLanguageSelects((currentLanguageSelects) => {
				const hasSameSelects =
					currentLanguageSelects.length === nextLanguageSelects.length &&
					currentLanguageSelects.every((languageSelect, index) => languageSelect === nextLanguageSelects[index]);

				return hasSameSelects ? currentLanguageSelects : nextLanguageSelects;
			});
		};

		updateLanguageSelects();
		const observer = new MutationObserver(updateLanguageSelects);
		observer.observe(editorElement, { childList: true, subtree: true });

		return () => {
			observer.disconnect();
			managedLanguageSelects.forEach((languageSelect) => {
				delete languageSelect.dataset.codeLanguageNative;
				languageSelect.removeAttribute('aria-hidden');
				languageSelect.removeAttribute('tabindex');
			});
		};
	}, [editor]);

	return (
		<>
			<MermaidCodeBlockPreviewController
				container={editor.domElement}
				debounceMs={300}
				label="Mermaid 다이어그램 미리보기"
			/>
			{languageSelects.map((languageSelect, index) => {
				const portalTarget = languageSelect.parentElement;
				if (portalTarget === null) {
					return null;
				}

				const blockId = languageSelect.closest<HTMLElement>('.bn-block-outer[data-id]')?.dataset.id;
				return createPortal(
					<CodeLanguageDropdown languageSelect={languageSelect} />,
					portalTarget,
					blockId ?? `code-language-${index}`,
				);
			})}
		</>
	);
}
