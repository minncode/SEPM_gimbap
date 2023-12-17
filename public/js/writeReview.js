function selectOption(option, sectionName) {
    const section = document.querySelector(`.section.${sectionName}`);
    const options = section.querySelectorAll(`.option`);

    options.forEach(opt => {
        opt.classList.remove('selected');
    });

    option.classList.add('selected');
}