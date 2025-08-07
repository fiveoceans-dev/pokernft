const GenericModal = ({
  children,
  className = "modal-box modal-border rounded-[8px] border flex flex-col gap-3 justify-around relative bg-[var(--color-accent)] text-black",
  modalId,
}: {
  children: React.ReactNode;
  className?: string;
  modalId: string;
}) => {
  return (
    <label htmlFor={modalId} className="modal  backdrop-blur cursor-pointer">
      <label className={className}>
        {/* dummy input to capture event onclick on modal box */}
        <input className="h-0 w-0 absolute top-0 left-0" />
        {children}
      </label>
    </label>
  );
};

export default GenericModal;
