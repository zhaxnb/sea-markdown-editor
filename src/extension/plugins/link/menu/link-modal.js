import React, { useMemo, useRef, useState } from 'react';
import { Button, Form, FormFeedback, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { insertLink, isLinkType, updateLink } from '../helper';
import { Editor } from 'slate';
import { isUrl } from '../../../../utils/common';

const LinkModal = ({ editor, onCloseModal, linkTitle, linkUrl }) => {
  const [formData, setFormData] = useState({ linkUrl: linkUrl ?? '', linkTitle: linkTitle ?? '', });
  const [validatorErrorMessage, setValidatorErrorMessage] = useState({ linkUrl: '', linkTitle: '', });
  const linkAddressRef = useRef(null);
  const { t } = useTranslation();

  const isSubmitDisabled = useMemo(() => {
    const isFormdataEmpty = Object.values(formData).some((value) => value.length === 0);
    if (isFormdataEmpty) return true;
    const isValidatorErrorMessage = Object.values(validatorErrorMessage).some((value) => value.length > 0);
    if (isValidatorErrorMessage) return true;
    return false;
  }, [formData, validatorErrorMessage]);

  const onOpened = () => {
    linkAddressRef.current?.focus();
  };

  /**
   * @param {String} formItemName  form item name
   * @param {String} formItemValue form item value
   * @returns if validate passed, return Promise.resolve(); else return Promise.reject(error message);
   */
  const validateFormData = (formItemName, formItemValue) => {
    if (formItemName === 'linkUrl') {
      if (formItemValue.length === 0) return Promise.reject('Link_address_required');
      if (!isUrl(formItemValue)) return Promise.reject('Link_address_invalid');
    }
    if (formItemName === 'linkTitle') {
      if (formItemValue.length === 0) return Promise.reject('Link_title_required');
    }
    return Promise.resolve();
  };

  const onFormValueChange = (e) => {
    const formItemName = e.target.name;
    const formItemValue = e.target.value;
    validateFormData(formItemName, formItemValue).then(
      () => setValidatorErrorMessage({ ...validatorErrorMessage, [formItemName]: '' }),
      (errMsg) => setValidatorErrorMessage({ ...validatorErrorMessage, [formItemName]: errMsg })
    );
    setFormData({ ...formData, [formItemName]: formItemValue });
  };

  const onSubmit = (e) => {
    // re-validate form data before submit
    Object.entries(formData)
      .forEach(([key, value]) => validateFormData(key, value)
        .catch((errMsg) => setValidatorErrorMessage(prev => ({ ...prev, [key]: errMsg })))
      );
    if (!isSubmitDisabled) {
      const isLinkActive = isLinkType(editor);
      isLinkActive
        ? updateLink(editor, formData.linkUrl, formData.linkTitle)
        : insertLink({ editor, url: formData.linkUrl, title: formData.linkTitle });
      onCloseModal();
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const onKeydown = (e) => {
    if (e.key === 'Enter') {
      onSubmit(e);
    }
  };

  return (
    <Modal isOpen={true} toggle={onCloseModal} onOpened={onOpened} >
      <ModalHeader toggle={onCloseModal}>{t('Insert_link')}</ModalHeader>
      <ModalBody>
        <Form onChange={onFormValueChange}>
          <FormGroup >
            <Label for='linkUrl'>{t('Link_address')}</Label>
            {/* `onChange={() => void 0}`  to fix reactstrap error which need `onChange` when `value` setteled, (`onChange` has been listened at `<Form>` )*/}
            <Input onKeyDown={onKeydown} onChange={() => void 0} value={formData.linkUrl} invalid={!!validatorErrorMessage.linkUrl} name='linkUrl' innerRef={linkAddressRef} type='url' id='linkUrl' />
            <FormFeedback>{t(validatorErrorMessage.linkUrl)}</FormFeedback>
          </FormGroup>
          <FormGroup>
            <Label for='linkTitle'>{t('Link_title')}</Label>
            {/* `onChange={() => void 0}`  to fix reactstrap error which need `onChange` when `value` setteled, (`onChange` has been listened at `<Form>` )*/}
            <Input onKeyDown={onKeydown} onChange={() => void 0} value={formData.linkTitle} invalid={!!validatorErrorMessage.linkTitle} name='linkTitle' id='linkTitle' />
            <FormFeedback>{t(validatorErrorMessage.linkTitle)}</FormFeedback>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onCloseModal} color="secondary">{t('Cancel')}</Button>
        <Button onClick={onSubmit} disabled={isSubmitDisabled} color="primary">{t('Add_link')}</Button>
      </ModalFooter>
    </Modal>
  );
};

LinkModal.propTypes = {
  editor: PropTypes.object.isRequired,
  onCloseModal: PropTypes.func.isRequired,
  linkTitle: PropTypes.string,
  linkUrl: PropTypes.string,
};

export default LinkModal;
